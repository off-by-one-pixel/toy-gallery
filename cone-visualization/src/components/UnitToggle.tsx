'use client';

import { ToggleButton, ToggleButtonGroup } from '@heroui/react';

import { useUnit } from '../providers/UnitProvider';
import { Unit, unitById } from '../services/units';

export default function UnitToggle() {
  const { unit, setUnit } = useUnit();

  return (
    <ToggleButtonGroup
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[unit.id]}
      onSelectionChange={(keys) => {
        const next = unitById([...keys][0] as string);
        if (next) setUnit(next);
      }}
      aria-label="Display units"
      size="sm"
    >
      {Object.values(Unit).map((u) => (
        <ToggleButton key={u.id} id={u.id}>
          {u.id}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
