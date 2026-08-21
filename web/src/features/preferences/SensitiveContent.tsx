'use client';

import type { ReactNode } from 'react';

import { usePrivacy } from '@/features/preferences/PrivacyProvider';

type Props = Readonly<{ children: ReactNode; className?: string }>;

export default function SensitiveContent({ children, className }: Props) {
  const { hideSensitive } = usePrivacy();
  if (!hideSensitive) return <>{children}</>;
  return (
    <div inert aria-hidden className={`select-none overflow-hidden ${className ?? ''}`}>
      <div className="h-full w-full scale-110 blur-lg">{children}</div>
    </div>
  );
}
