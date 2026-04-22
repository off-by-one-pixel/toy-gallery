import { API_CONFIG } from '../config';
import { APIError, type AuthContext } from './types';

let authContext: AuthContext | null = null;

export const setAuthContext = (ctx: AuthContext | null): void => {
  authContext = ctx;
};

const UNAUTHENTICATED_PATHS = ['/toys/token/', '/toys/token/refresh/'];

const isUnauthenticated = (path: string): boolean => UNAUTHENTICATED_PATHS.some((p) => path.startsWith(p));

const attachAuth = (init: RequestInit): RequestInit => {
  const headers = new Headers(init.headers);
  const token = authContext?.getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
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
  const detail =
    (typeof data === 'object' && data !== null && 'detail' in data && (data as { detail?: string }).detail) ||
    (typeof data === 'object' && data !== null && 'message' in data && (data as { message?: string }).message) ||
    'API request failed';
  return new APIError(String(detail), response.status, data);
};

/**
 * Orval mutator. Every generated SDK call routes through here so Bearer
 * attach, 401→refresh→retry, and APIError wrapping stay in one place. The
 * generated code expects a `{ data, status, headers }` envelope back.
 */
export const customFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const absoluteUrl = url.startsWith('http') ? url : `${API_CONFIG.baseUrl}${url}`;
  const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
  const shouldAuth = !isUnauthenticated(path);

  const doFetch = () => fetch(absoluteUrl, shouldAuth ? attachAuth(options) : options);

  let response: Response;
  try {
    response = await doFetch();
  } catch (error) {
    throw new APIError('Network error', 0, error);
  }

  if (shouldAuth && response.status === 401 && authContext) {
    const newAccess = await authContext.onUnauthorized();
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
