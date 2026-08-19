'use client';

import { type ReactNode } from 'react';

import AuthGate from '../../components/AuthGate';
import { LiveSessionProvider } from '../../providers/LiveSessionProvider';

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthGate>
      <LiveSessionProvider>{children}</LiveSessionProvider>
    </AuthGate>
  );
}
