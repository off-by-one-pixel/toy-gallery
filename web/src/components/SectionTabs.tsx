'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';

import Switcher, { type SwitcherItem } from '@/components/Switcher';

type Key = 'gallery' | 'sessions';

const TABS: { key: Key; href: string; matches: (p: string) => boolean }[] = [
  { key: 'gallery', href: '/', matches: (p) => p === '/' },
  { key: 'sessions', href: '/sessions', matches: (p) => p.startsWith('/sessions') },
];

type Props = Readonly<{
  className?: string;
}>;

export default function SectionTabs({ className }: Props) {
  const pathname = usePathname() ?? '/';
  const t = useTranslations('nav');
  const active = TABS.find((tab) => tab.matches(pathname))?.key ?? null;
  const items: SwitcherItem<Key>[] = TABS.map((tab) => ({
    key: tab.key,
    label: t(tab.key),
    href: tab.href,
  }));
  return <Switcher items={items} value={active} ariaLabel={t('ariaLabel')} fullWidth className={className} />;
}
