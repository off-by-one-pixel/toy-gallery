'use client';

import { ToggleButton } from '@heroui/react';
import { LayoutGrid, List } from 'lucide-react';
import type { ReactNode } from 'react';

import { VIEW_MODE_LABEL, VIEW_TOGGLE_ARIA_LABEL } from '../labels';
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
  return (
    <SegmentedToggle value={view} onChange={onChange} ariaLabel={VIEW_TOGGLE_ARIA_LABEL}>
      {Object.values(ViewMode).map((v) => (
        <ToggleButton key={v} id={v} aria-label={VIEW_MODE_LABEL[v]}>
          {VIEW_MODE_ICON[v]}
          <span className="hidden sm:inline">{VIEW_MODE_LABEL[v]}</span>
        </ToggleButton>
      ))}
    </SegmentedToggle>
  );
}
