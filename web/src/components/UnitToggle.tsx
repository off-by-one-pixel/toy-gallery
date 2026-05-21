'use client';

import { ToggleButton } from '@heroui/react';

import { UNIT_TOGGLE_ARIA_LABEL } from '../labels';
import { useUnit } from '../providers/UnitProvider';
import { Unit, unitById } from '../services/units';
import SegmentedToggle from './SegmentedToggle';

export default function UnitToggle() {
  const { unit, setUnit } = useUnit();

  return (
    <SegmentedToggle
      value={unit.id}
      onChange={(id) => {
        const next = unitById(id);
        if (next) setUnit(next);
      }}
      ariaLabel={UNIT_TOGGLE_ARIA_LABEL}
    >
      {Object.values(Unit).map((u) => (
        <ToggleButton key={u.id} id={u.id}>
          {u.id}
        </ToggleButton>
      ))}
    </SegmentedToggle>
  );
}
