'use client';

import { formatValue, type Unit } from '../../services/units';

type Props = Readonly<{
  label: string;
  mm: number | null;
  unit: Unit;
}>;

export default function PeakRow({ label, mm, unit }: Props) {
  return (
    <div className="flex items-baseline justify-end gap-2 py-0.5">
      <span className="text-[11px] uppercase tracking-wider text-neutral-400">{label}</span>
      {mm == null ? (
        <span className="text-[17px] font-medium text-neutral-400">—</span>
      ) : (
        <span className="text-[17px] font-semibold tracking-tight tabular-nums text-neutral-900">
          {formatValue(mm, unit)}
          <span className="ml-1.5 text-[11px] font-medium text-neutral-500">{unit.id}</span>
        </span>
      )}
    </div>
  );
}
