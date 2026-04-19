'use client';

import { ToggleButton, ToggleButtonGroup } from '@heroui/react';

import { useUnit } from '../providers/UnitProvider';
import { Unit } from '../services/units';

export default function UnitToggle() {
  const { unit, setUnit } = useUnit();

  return (
    <ToggleButtonGroup
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[unit]}
      onSelectionChange={(keys) => setUnit([...keys][0] as Unit)}
      aria-label="Display units"
      size="sm"
    >
      {Object.values(Unit).map((u) => (
        <ToggleButton key={u} id={u}>{u}</ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
