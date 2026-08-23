'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Chip } from '@heroui/react';
import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useGirth } from '@/features/preferences/GirthProvider';
import { displayGirth } from '@/features/preferences/girth';
import { useUnit } from '@/features/preferences/UnitProvider';
import { toyShapeToEditor } from '@/features/toys/converters/toyShape';
import { formatValue, type Unit } from '@/features/preferences/units';
import { type Toy } from '@/api/types';
import { useSortOf } from '@/hooks/useSortOf';
import { TOY_SORT } from '@/features/toys/toySort';
import AttributesPanel from '@/features/toys/gallery/AttributesPanel';
import { cardSortValue } from '@/features/toys/gallery/cardSortValue';
import type { ToyPropertyContext } from '@/features/toys/properties';
import { formatDuration } from '@/lib/duration';
import ToyActionButtons from '@/features/toys/gallery/ToyActionButtons';
import ToyThumbnail from '@/features/toys/ToyThumbnail';

type Props = Readonly<{
  toy: Toy;
  heightRatio: number;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  onEdit: (toy: Toy) => void;
  onCopy: (toy: Toy) => void;
  onDelete: (toy: Toy) => void;
}>;

export default function ToyCard({ toy, heightRatio, detailsOpen, onToggleDetails, onEdit, onCopy, onDelete }: Props) {
  const { unit } = useUnit();
  const { girth } = useGirth();
  const common = useTranslations('common');
  const tToy = useTranslations('toy');
  const locale = useLocale();
  const detailsRef = useRef<HTMLDivElement>(null);
  const { sort } = useSortOf(TOY_SORT);
  const tAll = useTranslations();
  const propertyCtx: ToyPropertyContext = { t: tAll as unknown as ToyPropertyContext['t'], girth, unit, locale };
  const sortValue = cardSortValue(sort, toy, propertyCtx);

  const editorToy = toyShapeToEditor(toy.shape);

  const handleClick = (e: React.MouseEvent) => {
    if (detailsRef.current?.contains(e.target as Node)) return;
    onToggleDetails();
  };

  return (
    <div
      className={
        'group relative bg-surface shadow-sm transition-[transform,box-shadow] duration-200 cursor-pointer ' +
        (detailsOpen
          ? 'z-10 rounded-t-2xl rounded-b-none'
          : 'z-0 rounded-2xl hover:shadow-lg motion-safe:hover:-translate-y-1')
      }
      role="button"
      tabIndex={0}
      aria-expanded={detailsOpen}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (detailsRef.current?.contains(e.target as Node)) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleDetails();
        }
      }}
    >
      <ToyThumbnail
        toy={editorToy}
        fillColor={toy.color}
        heightRatio={heightRatio}
        className="h-60 overflow-hidden rounded-t-2xl border-b border-border"
      >
        {sortValue && (
          <div className="absolute top-2.5 right-2.5 z-10 transition-opacity group-hover:opacity-0">
            <Chip size="sm" className="bg-surface shadow-sm">
              <Chip.Label>
                <span className="inline-flex items-baseline gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted">{sortValue.label}</span>
                  <span className="font-semibold tabular-nums">{sortValue.value}</span>
                </span>
              </Chip.Label>
            </Chip>
          </div>
        )}
        <div className="absolute top-2.5 right-2.5 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <ToyActionButtons
            onEdit={() => onEdit(toy)}
            onCopy={() => onCopy(toy)}
            onDelete={() => onDelete(toy)}
            stopPropagation
          />
        </div>
      </ToyThumbnail>
      <div className="px-3.5 py-3">
        <div className="mb-2 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-caption font-medium uppercase tracking-wider text-muted truncate">{toy.brand}</div>
            <div className="truncate text-sm font-semibold text-foreground">{toy.name}</div>
          </div>
          {toy.size && (
            <Chip size="sm" color="accent" className="shrink-0">
              <Chip.Label>{toy.size}</Chip.Label>
            </Chip>
          )}
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-border pt-2.5">
          <Metric label={common('insertable')} value={toy.insertableLength} unit={unit} />
          <Metric label={common(girth)} value={displayGirth(toy.circumference, girth)} unit={unit} bordered />
        </div>
      </div>

      <div
        ref={detailsRef}
        className={
          'absolute left-0 right-0 top-[calc(100%-14px)] z-20 flex flex-col gap-1 overflow-hidden rounded-b-2xl bg-surface px-4 pb-3.5 pt-4 shadow-md transition-all duration-200 ' +
          (detailsOpen
            ? 'visible translate-y-0 opacity-100 border-2 border-t-0 border-accent'
            : 'invisible -translate-y-2 opacity-0 pointer-events-none')
        }
      >
        <AttrRow
          label="Total length"
          value={toy.totalLength == null ? '—' : `${formatValue(toy.totalLength, unit)} ${unit.id}`}
        />
        <AttrRow
          label={tToy('timesUsed')}
          value={`${toy.usageCount ?? 0}`}
          href={(toy.usageCount ?? 0) > 0 ? `/sessions?toys=${toy.id}` : undefined}
          hrefLabel={tToy('viewSessions')}
        />
        <AttrRow label={tToy('timeUsed')} value={formatDuration(toy.totalDurationMinutes ?? 0, locale)} />
        <AttributesPanel toy={toy} />
      </div>

      {detailsOpen && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 rounded-t-2xl border-2 border-b-0 border-accent"
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  bordered,
}: Readonly<{
  label: string;
  value: number | null | undefined;
  unit: Unit;
  bordered?: boolean;
}>) {
  return (
    <div className={bordered ? 'pl-3 border-l border-border' : ''}>
      <div className="flex items-baseline gap-1 text-[22px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
        {formatValue(value, unit)}
        {value != null && <span className="text-xs font-medium text-muted">{unit.id}</span>}
      </div>
      <div className="mt-0.5 text-caption uppercase tracking-wider text-text-tertiary">{label}</div>
    </div>
  );
}

function AttrRow({
  label,
  value,
  href,
  hrefLabel,
}: Readonly<{ label: string; value: string; href?: string; hrefLabel?: string }>) {
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
      <span className="px-1.5 py-0.5 text-xs text-foreground">{label}</span>
      {href === undefined ? (
        <span className="px-1.5 py-0.5 text-xs tabular-nums text-foreground">{value}</span>
      ) : (
        <Link
          href={href}
          aria-label={hrefLabel}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium tabular-nums text-accent transition-colors hover:text-accent-hover"
        >
          {value}
          <ArrowRight size={11} strokeWidth={2.2} />
        </Link>
      )}
      <span aria-hidden className="w-3" />
    </div>
  );
}
