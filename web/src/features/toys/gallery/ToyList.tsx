'use client';

import { useRef } from 'react';
import { Chip } from '@heroui/react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ToyThumbnail from '@/features/toys/ToyThumbnail';

import { useGirth } from '@/features/preferences/useGirth';
import { useSortOf } from '@/hooks/useSortOf';
import { displayGirth } from '@/features/preferences/girth';
import { cycleSort, type Sort } from '@/lib/sort';
import { TOY_SORT, type ToySortColumn as SortColumn } from '@/features/toys/toySort';
import { formatValue, type Unit } from '@/features/preferences/units';
import { type Toy } from '@/api/types';
import ToyDetails from '@/features/toys/gallery/ToyDetails';
import { type SortColumnDisplay, sortColumnDisplay } from '@/features/toys/gallery/sortColumnDisplay';
import { useToyPropertyContext } from '@/features/toys/useToyPropertyContext';
import ToySortControl from '@/features/toys/gallery/ToySortControl';
import ToyActionButtons, { type ToyActions } from '@/features/toys/gallery/ToyActionButtons';

const GRID_COLS = 'grid-cols-[44px_3fr_1fr_1fr] ' + 'min-[640px]:grid-cols-[48px_3fr_60px_1fr_1fr]';
const EXTRA_GRID_COLS = 'grid-cols-[44px_3fr_1fr_1fr_1fr] ' + 'min-[640px]:grid-cols-[48px_3fr_60px_1fr_1fr_1fr]';

const HIDDEN_SIZE = 'hidden min-[640px]:block';

type Props = Readonly<{
  toys: Toy[];
  openToyId: number | null;
  onToggleOpen: (id: number) => void;
  actions: ToyActions;
}>;

export default function ToyList({ toys, openToyId, onToggleOpen, actions }: Props) {
  const propertyCtx = useToyPropertyContext();
  const { unit } = propertyCtx;
  const { sort, setSort } = useSortOf(TOY_SORT);
  const handleSort = (column: SortColumn) => setSort(cycleSort(sort, column));

  const extra = sortColumnDisplay(sort.column, propertyCtx);

  return (
    <>
      <div className="mb-3 hidden items-center justify-end sm:flex">
        <ToySortControl toys={toys} />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <ListHeader sort={sort} onSort={handleSort} extra={extra} />
        {toys.map((toy) => (
          <ToyRow
            key={toy.id}
            toy={toy}
            unit={unit}
            extra={extra}
            open={openToyId === toy.id}
            onToggle={() => onToggleOpen(toy.id)}
            actions={actions}
          />
        ))}
      </div>
    </>
  );
}

function ListHeader({
  sort,
  onSort,
  extra,
}: Readonly<{ sort: Sort<SortColumn>; onSort: (column: SortColumn) => void; extra: SortColumnDisplay | null }>) {
  const t = useTranslations('toy.columns');
  const common = useTranslations('common');
  const { girth } = useGirth();
  return (
    <div
      className={
        `grid items-center gap-x-3 border-b border-border bg-surface-secondary px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-text-tertiary min-[640px]:gap-x-3.5 min-[640px]:px-5 min-[640px]:text-caption min-[640px]:tracking-[0.08em] ` +
        (extra ? EXTRA_GRID_COLS : GRID_COLS)
      }
    >
      <span />
      <SortHeader label={t('brandModel')} shortLabel={t('brandModelShort')} column="name" sort={sort} onSort={onSort} />
      <span className={HIDDEN_SIZE}>{common('size')}</span>
      <SortHeader
        label={common('insertable')}
        shortLabel={t('insertableShort')}
        column="insertable"
        sort={sort}
        onSort={onSort}
        align="right"
      />
      <SortHeader
        label={common(girth)}
        shortLabel={t(`girthShort.${girth}`)}
        column="circumference"
        sort={sort}
        onSort={onSort}
        align="right"
      />
      {extra && <SortHeader label={extra.label} column={sort.column} sort={sort} onSort={onSort} align="right" />}
    </div>
  );
}

function SortHeader({
  label,
  shortLabel,
  column,
  sort,
  onSort,
  align,
  className,
}: Readonly<{
  label: string;
  shortLabel?: string;
  column: SortColumn;
  sort: Sort;
  onSort: (column: SortColumn) => void;
  align?: 'right';
  className?: string;
}>) {
  const active = sort.column === column;
  const dir = active ? sort.direction : null;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`inline-flex items-center gap-1 whitespace-nowrap uppercase transition-colors hover:text-muted ${
        active ? 'text-foreground' : ''
      } ${align === 'right' ? 'justify-end' : ''} ${className ?? ''}`}
    >
      {shortLabel ? (
        <>
          <span className="whitespace-nowrap md:hidden">{shortLabel}</span>
          <span className="hidden whitespace-nowrap md:inline">{label}</span>
        </>
      ) : (
        <span className="whitespace-nowrap">{label}</span>
      )}
      <ChevronDown
        size={8}
        strokeWidth={2.5}
        className={
          'transition-transform ' + (active ? 'opacity-100 ' : 'opacity-40 ') + (dir === 'asc' ? 'rotate-180' : '')
        }
      />
    </button>
  );
}

function ToyRow({
  toy,
  unit,
  extra,
  open,
  onToggle,
  actions,
}: Readonly<{
  toy: Toy;
  unit: Unit;
  extra: SortColumnDisplay | null;
  open: boolean;
  onToggle: () => void;
  actions: ToyActions;
}>) {
  const { girth } = useGirth();
  const actionsRef = useRef<HTMLDivElement>(null);
  const handleRowClick = (e: React.MouseEvent) => {
    if (actionsRef.current?.contains(e.target as Node)) return;
    onToggle();
  };
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className={
          `group relative grid cursor-pointer items-center gap-x-3 border-b border-border px-4 py-2.5 transition-colors hover:bg-surface-secondary min-[640px]:gap-x-3.5 min-[640px]:px-5 ` +
          (extra ? EXTRA_GRID_COLS : GRID_COLS) +
          (open ? ' bg-accent-soft/50' : '')
        }
      >
        <Thumb toy={toy} />
        <NameCol toy={toy} />
        <div className={HIDDEN_SIZE}>
          {toy.size && (
            <Chip size="sm" color="accent">
              <Chip.Label>{toy.size}</Chip.Label>
            </Chip>
          )}
        </div>
        <Metric value={toy.insertableLength} unit={unit} />
        <Metric value={displayGirth(toy.circumference, girth)} unit={unit} />
        {extra && <ExtraMetric value={extra.valueFor(toy)} />}
        <div
          ref={actionsRef}
          className="absolute right-3 top-1/2 hidden -translate-y-1/2 gap-1 rounded-md bg-surface/95 p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 sm:flex min-[640px]:right-4"
        >
          <ToyActionButtons toy={toy} actions={actions} />
        </div>
      </div>
      {open && <ExpandedPanel toy={toy} />}
    </>
  );
}

function Thumb({ toy }: Readonly<{ toy: Toy }>) {
  return (
    <ToyThumbnail
      shape={toy.shape}
      fillColor={toy.color}
      borderWidth={1}
      insetTop={4}
      insetBottom={4}
      insetX={4}
      className="h-15 w-12 rounded-md border border-border"
    />
  );
}

function NameCol({ toy }: Readonly<{ toy: Toy }>) {
  return (
    <div className="min-w-0">
      <div className="truncate text-caption font-normal uppercase tracking-[0.06em] text-muted min-[640px]:text-caption">
        {toy.brand}
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-sm font-semibold text-foreground min-[640px]:text-base">{toy.name}</span>
        {toy.size && (
          <Chip size="sm" color="accent" className="shrink-0 min-[640px]:hidden">
            <Chip.Label>{toy.size}</Chip.Label>
          </Chip>
        )}
      </div>
    </div>
  );
}

function Metric({
  value,
  unit,
  muted,
  className,
}: Readonly<{
  value: number | null | undefined;
  unit: Unit;
  muted?: boolean;
  className?: string;
}>) {
  return (
    <div
      className={`text-right text-[17px] font-semibold tracking-tight tabular-nums ${
        muted ? 'font-medium text-muted' : 'text-foreground'
      } ${className ?? ''}`}
    >
      {value == null ? (
        <span className="font-normal text-text-subtle">—</span>
      ) : (
        <>
          {formatValue(value, unit)}
          <span className="ml-1.5 text-caption font-medium text-muted">{unit.id}</span>
        </>
      )}
    </div>
  );
}

function ExtraMetric({ value }: Readonly<{ value: string | null }>) {
  return (
    <div className="text-right text-[15px] font-semibold tracking-tight text-foreground tabular-nums">
      {value ?? <span className="font-normal text-text-subtle">—</span>}
    </div>
  );
}

function ExpandedPanel({ toy }: Readonly<{ toy: Toy }>) {
  return (
    <div className="border-b border-border bg-surface-secondary px-4 py-3.5 min-[640px]:px-5">
      <div className="flex max-w-100 flex-col gap-1">
        <ToyDetails toy={toy} active />
      </div>
    </div>
  );
}
