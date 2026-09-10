'use client';

import Link from 'next/link';
import { useContext, type ReactNode } from 'react';

import { BottomSheetContext } from '@/components/BottomSheet';

export type SwitcherItem<T extends string> = Readonly<{
  key: T;
  label: ReactNode;
  ariaLabel?: string;
  href?: string;
}>;

type Props<T extends string> = Readonly<{
  items: readonly SwitcherItem<T>[];
  value: T | null;
  onChange?: (key: T) => void;
  ariaLabel: string;
  fullWidth?: boolean;
  className?: string;
}>;

export default function Switcher<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  fullWidth = false,
  className,
}: Props<T>) {
  const inSheet = useContext(BottomSheetContext);
  const baseClass =
    fullWidth || inSheet
      ? 'flex w-full gap-0.5 rounded-lg bg-surface-tertiary/70 p-0.5 sm:inline-flex sm:w-auto'
      : 'inline-flex gap-0.5 rounded-lg bg-surface-tertiary/70 p-0.5';
  const containerClass = className === undefined ? baseClass : `${baseClass} ${className}`;
  return (
    <div aria-label={ariaLabel} className={containerClass}>
      {items.map((item) => {
        const active = item.key === value;
        const itemClass =
          (fullWidth || inSheet ? 'flex-1 sm:flex-initial ' : '') +
          (inSheet
            ? 'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors '
            : 'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-center text-xs font-medium transition-colors ') +
          (active ? 'bg-surface text-foreground shadow-xs' : 'text-muted hover:text-foreground');
        if (item.href !== undefined) {
          return (
            <Link key={item.key} href={item.href} className={itemClass} aria-label={item.ariaLabel}>
              {item.label}
            </Link>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            className={itemClass}
            aria-label={item.ariaLabel}
            onClick={() => onChange?.(item.key)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
