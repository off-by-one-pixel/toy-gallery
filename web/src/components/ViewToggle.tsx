'use client';

import { ToggleButton } from '@heroui/react';
import { LayoutGrid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { ViewMode } from '../providers/ViewModeProvider';
import SegmentedToggle from './SegmentedToggle';

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
  return (
    <SegmentedToggle value={view} onChange={onChange} ariaLabel={t('ariaLabel')}>
      {Object.values(ViewMode).map((v) => (
        <ToggleButton key={v} id={v} aria-label={t(`mode.${v}`)}>
          {VIEW_MODE_ICON[v]}
          <span className="hidden sm:inline">{t(`mode.${v}`)}</span>
        </ToggleButton>
      ))}
    </SegmentedToggle>
  );
}
