'use client';

import { ToggleButton } from '@heroui/react';
import { useTranslations } from 'next-intl';

import { useUnit } from '../providers/UnitProvider';
import { Unit, unitById } from '../services/units';
import SegmentedToggle from './SegmentedToggle';

export default function UnitToggle() {
  const { unit, setUnit } = useUnit();
  const t = useTranslations('unitToggle');

  return (
    <SegmentedToggle
      value={unit.id}
      onChange={(id) => {
        const next = unitById(id);
        if (next) setUnit(next);
      }}
      ariaLabel={t('ariaLabel')}
    >
      {Object.values(Unit).map((u) => (
        <ToggleButton key={u.id} id={u.id}>
          {u.id}
        </ToggleButton>
      ))}
    </SegmentedToggle>
  );
}
