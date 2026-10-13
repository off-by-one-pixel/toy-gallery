'use client';

import { useTranslations } from 'next-intl';
import { useNavigation } from '@/hooks/useNavigation';

import Switcher, { type SwitcherItem } from '@/components/Switcher';
import { routes } from '@/routes';

type Key = 'gallery' | 'sessions';

const TABS: { key: Key; href: string; matches: (p: string) => boolean }[] = [
  { key: 'gallery', href: routes.home, matches: (p) => p === routes.home },
  { key: 'sessions', href: routes.sessions.list, matches: (p) => p.startsWith(routes.sessions.list) },
];

type Props = Readonly<{
  className?: string;
}>;

export default function SectionTabs({ className }: Props) {
  const { pathname } = useNavigation();
  const t = useTranslations('nav');
  const active = TABS.find((tab) => tab.matches(pathname))?.key ?? null;
  const items: SwitcherItem<Key>[] = TABS.map((tab) => ({
    key: tab.key,
    label: t(tab.key),
    href: tab.href,
  }));
  return <Switcher items={items} value={active} ariaLabel={t('ariaLabel')} fullWidth className={className} />;
}
