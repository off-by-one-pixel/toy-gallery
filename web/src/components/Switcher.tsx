'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export type SwitcherItem<T extends string> = Readonly<{
  key: T;
  label: ReactNode;
  shortLabel?: ReactNode;
  ariaLabel?: string;
  href?: string;
}>;

type Props<T extends string> = Readonly<{
  items: readonly SwitcherItem<T>[];
  value: T | null;
  onChange?: (key: T) => void;
  ariaLabel: string;
  fullWidth?: boolean;
}>;

export default function Switcher<T extends string>({ items, value, onChange, ariaLabel, fullWidth = false }: Props<T>) {
  const containerClass = fullWidth
    ? 'flex w-full gap-0.5 rounded-lg bg-surface-tertiary/70 p-0.5 sm:inline-flex sm:w-auto'
    : 'inline-flex gap-0.5 rounded-lg bg-surface-tertiary/70 p-0.5';
  return (
    <div aria-label={ariaLabel} className={containerClass}>
      {items.map((item) => {
        const active = item.key === value;
        const itemClass =
          (fullWidth ? 'flex-1 sm:flex-initial ' : '') +
          'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-center text-xs font-medium transition-colors ' +
          (active ? 'bg-surface text-foreground shadow-xs' : 'text-muted hover:text-foreground');
        const content =
          item.shortLabel !== undefined ? (
            <>
              <span className="sm:hidden">{item.shortLabel}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </>
          ) : (
            item.label
          );
        if (item.href !== undefined) {
          return (
            <Link key={item.key} href={item.href} className={itemClass} aria-label={item.ariaLabel}>
              {content}
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
            {content}
          </button>
        );
      })}
    </div>
  );
}
