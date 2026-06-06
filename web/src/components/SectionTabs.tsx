'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = {
  labelKey: 'gallery' | 'sessions';
  href: string;
  matches: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  { labelKey: 'gallery', href: '/', matches: (p) => p === '/' },
  { labelKey: 'sessions', href: '/sessions', matches: (p) => p.startsWith('/sessions') },
];

export default function SectionTabs() {
  const pathname = usePathname() ?? '/';
  const t = useTranslations('nav');
  return (
    <nav className="flex w-full gap-0.5 rounded-lg bg-surface-tertiary/70 p-0.5 sm:inline-flex sm:w-auto">
      {TABS.map((tab) => {
        const active = tab.matches(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              'flex-1 rounded-md px-3 py-1 text-center text-xs font-medium transition-colors sm:flex-initial ' +
              (active ? 'bg-surface text-foreground shadow-xs' : 'text-muted hover:text-foreground')
            }
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
