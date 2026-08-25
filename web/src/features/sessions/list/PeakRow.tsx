'use client';

import { formatValue, type Unit } from '@/features/preferences/units';
import RecordTrophy from '@/features/sessions/list/RecordTrophy';

type Props = Readonly<{
  label: string;
  mm: number | null;
  unit: Unit;
  recordLabel?: string;
}>;

export default function PeakRow({ label, mm, unit, recordLabel }: Props) {
  return (
    <div className="flex items-baseline gap-2 py-0.5 sm:contents">
      <span className="text-caption uppercase tracking-wider text-text-tertiary sm:justify-self-end">{label}</span>
      {mm == null ? (
        <span className="text-[15px] font-medium text-text-tertiary sm:justify-self-start sm:text-[17px]">—</span>
      ) : (
        <span className="text-[15px] font-semibold tracking-tight tabular-nums text-foreground sm:justify-self-start sm:text-[17px]">
          {formatValue(mm, unit)}
          <span className="ml-1.5 text-caption font-medium text-muted">{unit.id}</span>
          {recordLabel && <RecordTrophy label={recordLabel} className="relative -top-0.5 ml-1.5 align-middle" />}
        </span>
      )}
    </div>
  );
}
