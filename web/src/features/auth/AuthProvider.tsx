'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { login as authLogin, setSessionExpiredHandler, tokenStorage } from '@/features/auth/tokens';

interface AuthState {
  username: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<AuthState>({
    username: null,
    isAuthenticated: false,
    isHydrated: false,
  });

  useEffect(() => {
    setState({
      username: tokenStorage.getUsername(),
      isAuthenticated: !!tokenStorage.getAccess(),
      isHydrated: true,
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    await authLogin(username, password);
    setState({ username, isAuthenticated: true, isHydrated: true });
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setState({ username: null, isAuthenticated: false, isHydrated: true });
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(logout);
    return () => setSessionExpiredHandler(null);
  }, [logout]);

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
