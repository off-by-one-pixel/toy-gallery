'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { formatDuration } from '@/lib/duration';
import { useUnit } from '@/features/preferences/useUnit';
import { formatValue } from '@/features/preferences/units';
import type { Toy } from '@/api/types';
import AttributesPanel from '@/features/toys/gallery/AttributesPanel';
import RecordList from '@/features/sessions/list/RecordList';
import { toyRecordItems } from '@/features/sessions/records';

export default function ToyDetails({ toy, active }: Readonly<{ toy: Toy; active: boolean }>) {
  const { unit } = useUnit();
  const common = useTranslations('common');
  const tToy = useTranslations('toy');
  const locale = useLocale();

  return (
    <>
      <RecordList
        items={toyRecordItems(toy.records, locale)}
        className="mb-1 border-b pb-2.5"
        noteClassName="ml-auto text-caption tabular-nums text-muted"
      />
      <AttrRow
        label={common('totalLength')}
        value={toy.totalLength == null ? '—' : `${formatValue(toy.totalLength, unit)} ${unit.id}`}
      />
      <AttrRow
        label={tToy('timesUsed')}
        value={`${toy.usageCount ?? 0}`}
        href={(toy.usageCount ?? 0) > 0 ? `/sessions?toys=${toy.id}` : undefined}
        hrefLabel={tToy('viewSessions')}
      />
      <AttrRow label={tToy('timeUsed')} value={formatDuration(toy.totalDurationMinutes ?? 0, locale)} />
      <AttributesPanel toy={toy} active={active} />
    </>
  );
}

function AttrRow({
  label,
  value,
  href,
  hrefLabel,
}: Readonly<{ label: string; value: string; href?: string; hrefLabel?: string }>) {
  return (
    <div className="grid grid-cols-[1.3fr_1fr_auto] items-center gap-2">
      <span className="py-0.5 text-xs text-foreground">{label}</span>
      {href === undefined ? (
        <span className="py-0.5 text-xs tabular-nums text-foreground">{value}</span>
      ) : (
        <Link
          href={href}
          aria-label={hrefLabel}
          className="inline-flex items-center gap-1 py-0.5 text-xs font-medium tabular-nums text-accent transition-colors hover:text-accent-hover"
        >
          {value}
          <ArrowRight size={11} strokeWidth={2.2} />
        </Link>
      )}
      <span aria-hidden className="w-3" />
    </div>
  );
}
