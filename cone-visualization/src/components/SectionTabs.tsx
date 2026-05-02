'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SESSIONS_TITLE } from '../labels';

type Tab = {
  label: string;
  href: string;
  matches: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  { label: 'Gallery', href: '/', matches: (p) => p === '/' },
  { label: SESSIONS_TITLE, href: '/sessions', matches: (p) => p.startsWith('/sessions') },
];

export default function SectionTabs() {
  const pathname = usePathname() ?? '/';
  return (
    <nav className="inline-flex gap-0.5 rounded-lg bg-neutral-200/70 p-0.5">
      {TABS.map((tab) => {
        const active = tab.matches(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              'rounded-md px-3 py-1 text-xs font-medium transition-colors ' +
              (active
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900')
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
