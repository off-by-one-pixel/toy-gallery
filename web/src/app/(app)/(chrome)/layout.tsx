'use client';

import { type ReactNode } from 'react';

import TopBar from '@/components/TopBar';
import { TopBarProvider } from '@/components/TopBarProvider';

export default function ChromeLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <TopBarProvider>
      <TopBar />
      {children}
    </TopBarProvider>
  );
}
