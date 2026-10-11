import { API_CONFIG } from '@/config';
import { refreshTokens } from '@/api/index';
import { APIError, type TokenPair } from '@/api/types';

const ACCESS_KEY = 'auth.access';
const REFRESH_KEY = 'auth.refresh';
const USERNAME_KEY = 'auth.username';

const isBrowser = (): boolean => globalThis.window !== undefined;

export const tokenStorage = {
  getAccess: (): string | null => (isBrowser() ? localStorage.getItem(ACCESS_KEY) : null),
  getRefresh: (): string | null => (isBrowser() ? localStorage.getItem(REFRESH_KEY) : null),
  getUsername: (): string | null => (isBrowser() ? localStorage.getItem(USERNAME_KEY) : null),
  setTokens: (tokens: TokenPair, username?: string): void => {
    if (!isBrowser()) return;
    localStorage.setItem(ACCESS_KEY, tokens.access);
    localStorage.setItem(REFRESH_KEY, tokens.refresh);
    if (username) localStorage.setItem(USERNAME_KEY, username);
  },
  clear: (): void => {
    if (!isBrowser()) return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USERNAME_KEY);
  },
};

let onSessionExpired: (() => void) | null = null;

export const setSessionExpiredHandler = (handler: (() => void) | null): void => {
  onSessionExpired = handler;
};

let refreshInFlight: Promise<string | null> | null = null;

const refreshAccessToken = (): Promise<string | null> => {
  if (refreshInFlight) return refreshInFlight;
  const refresh = tokenStorage.getRefresh();
  if (!refresh) {
    onSessionExpired?.();
    return Promise.resolve(null);
  }

  refreshInFlight = (async () => {
    try {
      const tokens = await refreshTokens(refresh);
      tokenStorage.setTokens(tokens);
      return tokens.access;
    } catch (err) {
      console.warn('Silent token refresh failed', err);
      tokenStorage.clear();
      onSessionExpired?.();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

const parseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const toError = async (response: Response): Promise<APIError> => {
  const data = await parseBody(response);
  if (data === null || typeof data !== 'object') {
    return new APIError(`Server error (${response.status})`, response.status, null);
  }
  const body = data as { detail?: unknown; message?: unknown };
  const detail =
    (typeof body.detail === 'string' && body.detail) ||
    (typeof body.message === 'string' && body.message) ||
    'API request failed';
  return new APIError(detail, response.status, data);
};

const attachAuth = (init: RequestInit): RequestInit => {
  const token = tokenStorage.getAccess();
  if (!token) return init;
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
};

export const customFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const target = new URL(url, API_CONFIG.baseUrl);
  const doFetch = () => fetch(target, attachAuth(options));

  let response: Response;
  try {
    response = await doFetch();
  } catch (error) {
    throw new APIError('Network error', 0, error);
  }

  if (response.status === 401) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      try {
        response = await doFetch();
      } catch (error) {
        throw new APIError('Network error', 0, error);
      }
    }
  }

  if (!response.ok) throw await toError(response);

  return (await parseBody(response)) as T;
};
