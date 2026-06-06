'use client';

import type { ReactNode } from 'react';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import AppMenu from './AppMenu';
import SectionTabs from './SectionTabs';

type Props = Readonly<{
  subtitle?: ReactNode;
}>;

export default function TopBar({ subtitle }: Props) {
  const t = useTranslations('collection');
  return (
    <div className="bg-neutral-100/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-300 flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
        <h1 className="m-0 flex items-baseline gap-2">
          <Link
            href="/"
            aria-label={t('appTitleHomeLabel')}
            className="text-lg font-semibold tracking-tight text-neutral-900"
          >
            {t('appTitle')}
          </Link>
          {subtitle !== undefined && (
            <span className="inline-block min-w-22 text-sm font-normal text-neutral-500">{subtitle}</span>
          )}
        </h1>
        <SectionTabs />
        <div className="flex-1" />
        <AppMenu />
      </div>
    </div>
  );
}
