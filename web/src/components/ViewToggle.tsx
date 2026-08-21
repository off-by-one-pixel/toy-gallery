'use client';

import { LayoutGrid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { ViewMode } from '@/providers/ViewModeProvider';
import Switcher, { type SwitcherItem } from '@/components/Switcher';

const VIEW_MODE_ICON: Record<ViewMode, ReactNode> = {
  [ViewMode.cards]: <LayoutGrid size={13} strokeWidth={2} />,
  [ViewMode.list]: <List size={13} strokeWidth={2} />,
};

type Props = {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
};

export default function ViewToggle({ view, onChange }: Readonly<Props>) {
  const t = useTranslations('viewToggle');
  const items: SwitcherItem<ViewMode>[] = Object.values(ViewMode).map((v) => ({
    key: v,
    label: (
      <>
        {VIEW_MODE_ICON[v]}
        <span className="hidden sm:inline">{t(`mode.${v}`)}</span>
      </>
    ),
    ariaLabel: t(`mode.${v}`),
  }));
  return <Switcher items={items} value={view} onChange={onChange} ariaLabel={t('ariaLabel')} />;
}
