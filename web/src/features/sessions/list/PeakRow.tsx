'use client';

import type { ReactNode } from 'react';

import RecordTrophy from '@/features/sessions/list/RecordTrophy';

type Props = Readonly<{
  label: string;
  value: ReactNode;
  recordLabel?: string;
  live?: boolean;
}>;

export default function PeakRow({ label, value, recordLabel, live = false }: Props) {
  return (
    <div className="flex items-baseline gap-2 py-0.5 sm:contents">
      <span className="text-caption uppercase tracking-wider text-text-tertiary sm:justify-self-end">{label}</span>
      {value == null ? (
        <span className="text-[15px] font-medium text-text-tertiary sm:justify-self-start sm:text-[17px]">—</span>
      ) : (
        <span
          className={
            'whitespace-nowrap text-[15px] font-semibold tracking-tight tabular-nums sm:justify-self-start sm:text-[17px] ' +
            (live ? 'rounded-full bg-live/15 px-2.5 py-0.5 text-live-strong' : 'text-foreground')
          }
        >
          {value}
          {recordLabel && <RecordTrophy label={recordLabel} className="relative -top-0.5 ml-1.5 align-middle" />}
        </span>
      )}
    </div>
  );
}
