'use client';

import type { ReactNode } from 'react';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import AppMenu from '@/components/AppMenu';
import PrivacyToggle from '@/components/PrivacyToggle';
import SectionTabs from '@/components/SectionTabs';
import ThemeToggle from '@/components/ThemeToggle';

type Props = Readonly<{
  subtitle?: ReactNode;
}>;

export default function TopBar({ subtitle }: Props) {
  const t = useTranslations('collection');
  return (
    <div className="bg-surface-secondary/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-300 flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
        <h1 className="m-0 flex items-baseline gap-2">
          <Link
            href="/"
            aria-label={t('appTitleHomeLabel')}
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {t('appTitle')}
          </Link>
          {subtitle !== undefined && (
            <span className="inline-block min-w-22 text-sm font-normal text-muted">{subtitle}</span>
          )}
        </h1>
        <SectionTabs className="order-last sm:order-0" />
        <div className="flex-1" />
        <PrivacyToggle />
        <ThemeToggle lightTheme="light" darkTheme="dark" />
        <AppMenu />
      </div>
    </div>
  );
}
