import { login as apiLogin } from '@/api';
import { tokenStorage } from '@/api/http';

export { setSessionExpiredHandler, tokenStorage } from '@/api/http';

export async function login(username: string, password: string): Promise<void> {
  const tokens = await apiLogin(username, password);
  tokenStorage.setTokens(tokens, username);
}
