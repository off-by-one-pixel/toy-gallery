'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Props = Readonly<{ count: number; onClear: () => void }>;

export default function ClearGhostsButton({ count, onClear }: Props) {
  const t = useTranslations('toy.ghost');
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-amber-500 bg-amber-500/5 px-2.5 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-500/15 dark:text-amber-400"
    >
      {t('comparisons', { count })}
      <span className="text-muted">{t('clearAll')}</span>
      <X size={12} strokeWidth={2.2} />
    </button>
  );
}
