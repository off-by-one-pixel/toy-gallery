'use client';

import { useToyPropertyContext } from '@/features/toys/useToyPropertyContext';
import RecordTrophy from '@/features/sessions/list/RecordTrophy';
import { recordDisplay } from '@/features/sessions/records';
import { toyTooltip } from '@/features/sessions/session';
import type { SessionRecord, Toy } from '@/api/types';

type Props = Readonly<{
  records: readonly SessionRecord[];
  toysById: Map<number, Toy>;
}>;

export default function SessionRecordList({ records, toysById }: Props) {
  const ctx = useToyPropertyContext();

  const listed = records.flatMap((record) => {
    const display = recordDisplay(record.key);
    if (!display) return [];
    const toy = record.toy == null ? undefined : toysById.get(record.toy);
    return [
      {
        key: `${record.key}-${record.toy}`,
        label: display.label(ctx),
        value: display.value(record.value, ctx),
        toyName: toy ? toyTooltip(toy) : undefined,
      },
    ];
  });

  if (listed.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-2.5">
      {listed.map((item) => (
        <li key={item.key} className="flex items-center gap-2 text-xs">
          <RecordTrophy label={item.label} />
          <span className="font-medium text-foreground">{item.label}</span>
          <span className="font-semibold tabular-nums text-foreground">
            {item.value.text}
            {item.value.suffix && <span className="ml-1 text-caption font-medium text-muted">{item.value.suffix}</span>}
          </span>
          {item.toyName && <span className="min-w-0 truncate text-muted">{item.toyName}</span>}
        </li>
      ))}
    </ul>
  );
}
