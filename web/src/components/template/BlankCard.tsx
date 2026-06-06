'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Props = Readonly<{
  onClick: () => void;
}>;

export default function BlankCard({ onClick }: Props) {
  const t = useTranslations('template');
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-dashed border-border-secondary bg-surface-secondary/40 text-left transition-colors hover:border-accent hover:bg-accent-soft/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex h-44 items-center justify-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-border-secondary text-text-tertiary transition-colors group-hover:border-accent group-hover:text-accent">
          <Plus size={22} strokeWidth={2.2} />
        </span>
      </div>
      <div className="border-t border-border px-3 py-2.5">
        <div className="text-sm font-semibold text-foreground">{t('blankName')}</div>
        <div className="mt-0.5 line-clamp-2 text-xs text-muted">{t('blankDescription')}</div>
      </div>
    </button>
  );
}
