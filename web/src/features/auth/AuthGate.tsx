'use client';

import { useNavigation } from '@/hooks/useNavigation';
import { useEffect, ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';

export default function AuthGate({ children }: Readonly<{ children: ReactNode }>) {
  const { isAuthenticated, isHydrated } = useAuth();
  const { pathname, replace } = useNavigation();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      const next = encodeURIComponent(pathname || '/');
      replace(`/login?next=${next}`);
    }
  }, [isHydrated, isAuthenticated, pathname, replace]);

  if (!isHydrated || !isAuthenticated) return null;
  return <>{children}</>;
}
