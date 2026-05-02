import { API_CONFIG } from '../config';
import { refreshTokens } from './api';
import { APIError, type TokenPair } from './types';

// ---------- Token storage ----------

const ACCESS_KEY = 'auth.access';
const REFRESH_KEY = 'auth.refresh';
const USERNAME_KEY = 'auth.username';

const isBrowser = (): boolean => typeof window !== 'undefined';

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

// ---------- Silent token refresh (deduplicated across concurrent 401s) ----------

let refreshInFlight: Promise<string | null> | null = null;

const refreshAccessToken = (): Promise<string | null> => {
  if (refreshInFlight) return refreshInFlight;
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return Promise.resolve(null);

  refreshInFlight = (async () => {
    try {
      const tokens = await refreshTokens(refresh);
      tokenStorage.setTokens(tokens);
      return tokens.access;
    } catch (err) {
      console.warn('Silent token refresh failed', err);
      tokenStorage.clear();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

// ---------- Response parsing + error wrapping ----------

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

// ---------- Mutator ----------

const attachAuth = (init: RequestInit): RequestInit => {
  const token = tokenStorage.getAccess();
  if (!token) return init;
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
};

/**
 * Orval mutator. Every generated SDK call routes through here so Bearer
 * attach, 401→refresh→retry, and APIError wrapping stay in one place. The
 * generated code expects a `{ data, status, headers }` envelope back.
 */
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

  const data = await parseBody(response);
  return { data, status: response.status, headers: response.headers } as T;
};
