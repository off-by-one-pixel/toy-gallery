'use client';

import { useTranslations } from 'next-intl';

import { useGirth } from '@/features/preferences/GirthProvider';
import { displayGirth } from '@/features/preferences/girth';
import { formatValue, type Unit } from '@/features/preferences/units';
import RecordTrophy from '@/features/sessions/list/RecordTrophy';
import { recordDisplay } from '@/features/sessions/records';
import { toyTooltip } from '@/features/sessions/session';
import type { SessionRecord, Toy } from '@/api/types';

type Props = Readonly<{
  records: readonly SessionRecord[];
  toysById: Map<number, Toy>;
  unit: Unit;
}>;

export default function SessionRecordList({ records, toysById, unit }: Props) {
  const t = useTranslations('session');
  const { girth } = useGirth();
  const ctx = { t: t as unknown as (key: string) => string, girth };

  const listed = records.flatMap((record) => {
    const display = recordDisplay(record.key);
    if (!display) return [];
    const toy = toysById.get(record.toy);
    return [
      {
        key: record.key,
        label: display.label(ctx),
        value: display.peak === 'circumference' ? displayGirth(record.value, girth) : record.value,
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
            {formatValue(item.value, unit)}
            <span className="ml-1 text-caption font-medium text-muted">{unit.id}</span>
          </span>
          {item.toyName && <span className="min-w-0 truncate text-muted">{item.toyName}</span>}
        </li>
      ))}
    </ul>
  );
}
