'use client';

import { useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';

import BottomSheet from '@/components/BottomSheet';

export default function DisplayOptionsMenu({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTranslations('displayOptions');
  const [open, setOpen] = useState(false);
  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={t('ariaLabel')}
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-tertiary/70 text-muted transition-colors hover:text-foreground"
      >
        <SlidersHorizontal size={15} strokeWidth={1.8} />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} label={t('ariaLabel')}>
        <div className="flex flex-col gap-3 p-3">{children}</div>
      </BottomSheet>
    </div>
  );
}
