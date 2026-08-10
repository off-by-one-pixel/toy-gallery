'use client';

import { Dropdown } from '@heroui/react';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

export default function DisplayOptionsMenu({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTranslations('displayOptions');
  return (
    <div className="sm:hidden">
      <Dropdown>
        <Dropdown.Trigger
          aria-label={t('ariaLabel')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-tertiary/70 text-muted transition-colors hover:text-foreground"
        >
          <SlidersHorizontal size={15} strokeWidth={1.8} />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end">
          <div className="flex flex-col items-start gap-2.5 p-3">{children}</div>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
