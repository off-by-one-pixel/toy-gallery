import { login as apiLogin } from '@/api';
import { tokenStorage } from '@/api/http';

export { setSessionExpiredHandler, tokenStorage } from '@/api/http';
export type { TokenPair } from '@/api/types';

/** Log in and persist tokens. Resolves on success; throws on bad credentials. */
export async function login(username: string, password: string): Promise<void> {
  const tokens = await apiLogin(username, password);
  tokenStorage.setTokens(tokens, username);
}

export const logout = (): void => tokenStorage.clear();
