'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import AppMenu from '@/components/AppMenu';
import SectionTabs from '@/components/SectionTabs';
import { useTopBarSubtitle } from '@/components/TopBarProvider';
import ThemeToggle from '@/features/preferences/ThemeToggle';
import { routes } from '@/routes';

export default function TopBar() {
  const t = useTranslations('collection');
  const subtitle = useTopBarSubtitle();
  return (
    <div className="bg-surface-secondary/90 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-300 flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
        <h1 className="m-0 flex items-baseline gap-2">
          <Link
            href={routes.home}
            aria-label={t('appTitleHomeLabel')}
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {t('appTitle')}
          </Link>
          <span className="inline-block min-w-22 text-sm font-normal text-muted">{subtitle}</span>
        </h1>
        <SectionTabs className="order-last sm:order-0" />
        <div className="flex-1" />
        <ThemeToggle />
        <AppMenu />
      </div>
    </div>
  );
}
