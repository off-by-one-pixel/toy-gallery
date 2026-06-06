'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

type Props = Readonly<{
  anyExist: boolean;
  filterLabel: string;
}>;

export default function EmptyState({ anyExist, filterLabel }: Props) {
  const t = useTranslations('session');
  if (anyExist) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-12 text-center text-sm text-neutral-500">
        {`${t('emptyFilteredPrefix')} `}
        <span className="font-medium text-neutral-700">{filterLabel.toLowerCase()}</span>
        {'.'}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center">
      <div className="text-sm text-neutral-500">{t('empty')}</div>
      <Link
        href="/sessions/new"
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        <Plus size={14} strokeWidth={2.2} />
        {t('newButton')}
      </Link>
    </div>
  );
}
