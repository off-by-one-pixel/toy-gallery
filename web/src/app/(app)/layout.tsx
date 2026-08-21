'use client';

import { type ReactNode } from 'react';

import AuthGate from '@/features/auth/AuthGate';

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AuthGate>{children}</AuthGate>;
}
