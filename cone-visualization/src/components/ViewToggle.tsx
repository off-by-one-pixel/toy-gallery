'use client';

import { ToggleButton, ToggleButtonGroup } from '@heroui/react';
import { LayoutGrid, List } from 'lucide-react';

import { useViewMode, ViewMode } from '../providers/ViewModeProvider';

export default function ViewToggle() {
  const { view, setView } = useViewMode();

  return (
    <ToggleButtonGroup
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[view]}
      onSelectionChange={(keys) => setView([...keys][0] as ViewMode)}
      aria-label="Gallery view"
      size="sm"
    >
      <ToggleButton id={ViewMode.cards} aria-label="Cards">
        <LayoutGrid size={13} strokeWidth={2} />
        <span>Cards</span>
      </ToggleButton>
      <ToggleButton id={ViewMode.list} aria-label="List">
        <List size={13} strokeWidth={2} />
        <span>List</span>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
