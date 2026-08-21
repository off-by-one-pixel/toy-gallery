'use client';

import { useTranslations } from 'next-intl';

import { useUnit } from '@/providers/UnitProvider';
import { Unit, unitById } from '@/services/units';
import Switcher, { type SwitcherItem } from '@/components/Switcher';

type UnitId = (typeof Unit)[keyof typeof Unit]['id'];

export default function UnitToggle() {
  const { unit, setUnit } = useUnit();
  const t = useTranslations('unitToggle');
  const items: SwitcherItem<UnitId>[] = Object.values(Unit).map((u) => ({
    key: u.id,
    label: u.id,
  }));
  return (
    <Switcher
      items={items}
      value={unit.id}
      onChange={(id) => {
        const next = unitById(id);
        if (next) setUnit(next);
      }}
      ariaLabel={t('ariaLabel')}
    />
  );
}
