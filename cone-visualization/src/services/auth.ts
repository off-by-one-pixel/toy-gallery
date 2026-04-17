import { API_CONFIG } from '../config';

const ACCESS_KEY = 'auth.access';
const REFRESH_KEY = 'auth.refresh';
const USERNAME_KEY = 'auth.username';

export interface TokenPair {
  access: string;
  refresh: string;
}

const isBrowser = () => typeof window !== 'undefined';

export const tokenStorage = {
  getAccess: () => (isBrowser() ? localStorage.getItem(ACCESS_KEY) : null),
  getRefresh: () => (isBrowser() ? localStorage.getItem(REFRESH_KEY) : null),
  getUsername: () => (isBrowser() ? localStorage.getItem(USERNAME_KEY) : null),
  setTokens: (tokens: TokenPair, username?: string) => {
    if (!isBrowser()) return;
    localStorage.setItem(ACCESS_KEY, tokens.access);
    localStorage.setItem(REFRESH_KEY, tokens.refresh);
    if (username) localStorage.setItem(USERNAME_KEY, username);
  },
  clear: () => {
    if (!isBrowser()) return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USERNAME_KEY);
  },
};

export async function loginRequest(username: string, password: string): Promise<TokenPair> {
  const response = await fetch(`${API_CONFIG.baseUrl}/toys/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || 'Login failed');
  }
  return response.json();
}

let refreshInFlight: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return Promise.resolve(null);

  refreshInFlight = fetch(`${API_CONFIG.baseUrl}/toys/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
    .then(async (r) => {
      if (!r.ok) {
        tokenStorage.clear();
        return null;
      }
      const data = await r.json();
      tokenStorage.setTokens({
        access: data.access,
        refresh: data.refresh ?? refresh,
      });
      return data.access as string;
    })
    .catch(() => {
      tokenStorage.clear();
      return null;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}
