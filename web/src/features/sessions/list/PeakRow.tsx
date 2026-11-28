'use client';

import type { ReactNode } from 'react';

import RecordTrophy from '@/features/sessions/list/RecordTrophy';

type Props = Readonly<{
  label: string;
  value: ReactNode;
  recordLabel?: string;
}>;

export default function PeakRow({ label, value, recordLabel }: Props) {
  return (
    <div className="flex items-baseline gap-2 py-0.5 sm:contents">
      <span className="text-caption uppercase tracking-wider text-text-tertiary sm:justify-self-end">{label}</span>
      {value == null ? (
        <span className="text-[15px] font-medium text-text-tertiary sm:justify-self-start sm:text-[17px]">—</span>
      ) : (
        <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight text-foreground tabular-nums sm:justify-self-start sm:text-[17px]">
          {value}
          {recordLabel && <RecordTrophy label={recordLabel} className="relative -top-0.5 ml-1.5 align-middle" />}
        </span>
      )}
    </div>
  );
}
