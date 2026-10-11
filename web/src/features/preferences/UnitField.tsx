'use client';

import type { ReactNode } from 'react';

import TextInput from '@/components/TextInput';
import type { Unit } from '@/features/preferences/units';

type Props = Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit: Unit;
  trailing?: ReactNode;
}>;

export default function UnitField({ label, value, onChange, unit, trailing }: Props) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-caption uppercase tracking-wide text-muted">{label}</span>
      <TextInput
        size="sm"
        type="number"
        inputMode="decimal"
        min={0}
        step={unit.id === 'in' ? 0.1 : 1}
        value={value}
        onChange={onChange}
        trailing={
          <span className="flex items-center gap-2 text-xs text-muted">
            <span>{unit.id}</span>
            {trailing}
          </span>
        }
      />
    </label>
  );
}
