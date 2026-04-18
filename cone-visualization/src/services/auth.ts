import {
  login as apiLogin,
  refreshTokens as apiRefresh,
  setAuthContext,
  type AuthContext,
  type TokenPair,
} from './api';

const ACCESS_KEY = 'auth.access';
const REFRESH_KEY = 'auth.refresh';
const USERNAME_KEY = 'auth.username';

export type { TokenPair } from './api';

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

/** Log in and persist tokens. Resolves on success; throws on bad credentials. */
export async function login(username: string, password: string): Promise<void> {
  const tokens = await apiLogin(username, password);
  tokenStorage.setTokens(tokens, username);
}

export const logout = (): void => tokenStorage.clear();

// ---------- Silent refresh, deduplicated across concurrent 401s ----------

let refreshInFlight: Promise<string | null> | null = null;

const refreshAccessToken = (): Promise<string | null> => {
  if (refreshInFlight) return refreshInFlight;
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return Promise.resolve(null);

  refreshInFlight = apiRefresh(refresh)
    .then((tokens) => {
      tokenStorage.setTokens(tokens);
      return tokens.access;
    })
    .catch(() => {
      tokenStorage.clear();
      return null;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
};

// Register with the api client so it can attach the access token and ask
// for a refresh when a request returns 401.
const authContext: AuthContext = {
  getAccessToken: tokenStorage.getAccess,
  onUnauthorized: refreshAccessToken,
};
setAuthContext(authContext);
