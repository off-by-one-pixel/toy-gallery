'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { useAuth } from '../providers/AuthProvider';

export default function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isHydrated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      const next = encodeURIComponent(pathname || '/');
      router.replace(`/login?next=${next}`);
    }
  }, [isHydrated, isAuthenticated, pathname, router]);

  if (!isHydrated || !isAuthenticated) return null;
  return <>{children}</>;
}
