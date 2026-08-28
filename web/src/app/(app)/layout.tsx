'use client';

import { Suspense, type ReactNode } from 'react';

import { Spinner } from '@heroui/react';

import AuthGate from '@/features/auth/AuthGate';
import LiveSessionSyncSubscriber from '@/features/sessions/live/LiveSessionSyncSubscriber';

function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted">
      <Spinner />
    </div>
  );
}

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={<AppLoading />}>
      <AuthGate>
        <LiveSessionSyncSubscriber />
        {children}
      </AuthGate>
    </Suspense>
  );
}
