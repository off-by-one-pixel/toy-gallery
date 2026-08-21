'use client';

import { type ReactNode } from 'react';

import AuthGate from '@/features/auth/AuthGate';
import LiveSessionSyncSubscriber from '@/features/sessions/live/LiveSessionSyncSubscriber';

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthGate>
      <LiveSessionSyncSubscriber />
      {children}
    </AuthGate>
  );
}
