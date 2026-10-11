'use client';

import { useToyPropertyContext } from '@/features/toys/useToyPropertyContext';
import RecordTrophy from '@/features/sessions/list/RecordTrophy';
import { recordDisplay } from '@/features/sessions/records';
import type { ToyRecord } from '@/api/types';

export const latestToyRecords = (records: readonly ToyRecord[]): ToyRecord[] => {
  const latest = new Map<string, ToyRecord>();
  for (const record of records) {
    if (!latest.has(record.key)) latest.set(record.key, record);
  }
  return [...latest.values()];
};

export default function ToyRecordList({ records }: Readonly<{ records: readonly ToyRecord[] }>) {
  const ctx = useToyPropertyContext();

  const listed = latestToyRecords(records).flatMap((record) => {
    const display = recordDisplay(record.key);
    if (!display) return [];
    return [
      {
        key: record.key,
        label: display.label(ctx),
        value: display.value(record.value, ctx),
        achieved: new Date(record.achievedAt).toLocaleDateString(ctx.locale, { dateStyle: 'medium' }),
      },
    ];
  });

  if (listed.length === 0) return null;

  return (
    <ul className="mb-1 flex flex-col gap-1.5 border-b border-border pb-2.5">
      {listed.map((item) => (
        <li key={item.key} className="flex items-center gap-2 text-xs">
          <RecordTrophy label={item.label} />
          <span className="font-medium text-foreground">{item.label}</span>
          <span className="font-semibold tabular-nums text-foreground">
            {item.value.text}
            {item.value.suffix && <span className="ml-1 text-caption font-medium text-muted">{item.value.suffix}</span>}
          </span>
          <span className="ml-auto text-caption tabular-nums text-muted">{item.achieved}</span>
        </li>
      ))}
    </ul>
  );
}
