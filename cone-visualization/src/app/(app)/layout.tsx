'use client';

import { Suspense, type ReactNode } from 'react';

import AuthGate from '../../components/AuthGate';
import GlobalModals from '../../components/GlobalModals';

/** Chrome-scoped layout: gates every page below it behind authentication
 *  and renders modals whose URL-driven lifecycle is shared across pages
 *  (change-password). The modal lives inside a Suspense boundary so the
 *  useSearchParams read doesn't bail out static prerender of pages like
 *  /sessions/edit. */
export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthGate>
      {children}
      <Suspense fallback={null}>
        <GlobalModals />
      </Suspense>
    </AuthGate>
  );
}
