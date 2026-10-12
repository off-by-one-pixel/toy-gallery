'use client';

import { useToyPropertyContext } from '@/features/toys/useToyPropertyContext';
import RecordTrophy from '@/features/sessions/list/RecordTrophy';
import { recordDisplay, type RecordItem } from '@/features/sessions/records';

type Props = Readonly<{
  items: readonly RecordItem[];
  className: string;
  noteClassName: string;
}>;

export default function RecordList({ items, className, noteClassName }: Props) {
  const ctx = useToyPropertyContext();

  const listed = items.flatMap((item) => {
    const display = recordDisplay(item.key);
    return display ? [{ ...item, label: display.label(ctx), value: display.value(item.value, ctx) }] : [];
  });

  if (listed.length === 0) return null;

  return (
    <ul className={`flex flex-col gap-1.5 border-border ${className}`}>
      {listed.map((item) => (
        <li key={item.id} className="flex items-center gap-2 text-xs">
          <RecordTrophy label={item.label} />
          <span className="font-medium text-foreground">{item.label}</span>
          <span className="font-semibold tabular-nums text-foreground">
            {item.value.text}
            {item.value.suffix && <span className="ml-1 text-caption font-medium text-muted">{item.value.suffix}</span>}
          </span>
          {item.note && <span className={noteClassName}>{item.note}</span>}
        </li>
      ))}
    </ul>
  );
}
