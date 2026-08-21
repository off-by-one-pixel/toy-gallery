'use client';

import { useRef } from 'react';
import { Chip } from '@heroui/react';
import { ChevronDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatDuration } from '@/lib/duration';
import ToyThumbnail from '@/features/toys/ToyThumbnail';

import { useGirth } from '@/providers/GirthProvider';
import { useSortOf } from '@/hooks/useSortOf';
import { useUnit } from '@/providers/UnitProvider';
import { toyShapeToEditor } from '@/features/toys/converters/toyShape';
import { displayGirth } from '@/services/girth';
import { cycleSort, type Sort } from '@/lib/sort';
import { TOY_SORT, type ToySortColumn as SortColumn } from '@/features/toys/toySort';
import { formatValue, type Unit } from '@/services/units';
import { SectionShape, type Toy } from '@/api/types';
import AttributesPanel from '@/features/toys/gallery/AttributesPanel';
import ToyActionButtons from '@/features/toys/gallery/ToyActionButtons';

const DEFAULT_FILL = '#c7e4ee';

// Action buttons are absolute-positioned over the row on hover — they don't
// claim a grid column, so the brand/name column has more room and the grid
// layout doesn't change between hover states.
const GRID_COLS = 'grid-cols-[44px_3fr_1fr_1fr] ' + 'min-[640px]:grid-cols-[48px_3fr_60px_1fr_1fr]';

// SortHeader buttons need `inline-flex` at the breakpoint so the chevron
// stays inline; plain cells can use `block`.
const HIDDEN_SIZE = 'hidden min-[640px]:block';

type Props = Readonly<{
  toys: Toy[];
  openToyId: number | null;
  onToggleOpen: (id: number) => void;
  onEdit: (toy: Toy) => void;
  onCopy: (toy: Toy) => void;
  onDelete: (toy: Toy) => void;
}>;

export default function ToyList({ toys, openToyId, onToggleOpen, onEdit, onCopy, onDelete }: Props) {
  const { unit } = useUnit();
  const { sort, setSort } = useSortOf(TOY_SORT);
  const handleSort = (column: SortColumn) => setSort(cycleSort(sort, column));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <ListHeader sort={sort} onSort={handleSort} />
      {toys.map((toy) => (
        <ToyRow
          key={toy.id}
          toy={toy}
          unit={unit}
          open={openToyId === toy.id}
          onToggle={() => onToggleOpen(toy.id)}
          onEdit={() => onEdit(toy)}
          onCopy={() => onCopy(toy)}
          onDelete={() => onDelete(toy)}
        />
      ))}
    </div>
  );
}

function ListHeader({ sort, onSort }: Readonly<{ sort: Sort | null; onSort: (column: SortColumn) => void }>) {
  const t = useTranslations('toy.columns');
  const common = useTranslations('common');
  const { girth } = useGirth();
  return (
    <div
      className={
        `grid items-center gap-x-3 border-b border-border bg-surface-secondary px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-text-tertiary min-[640px]:gap-x-3.5 min-[640px]:px-5 min-[640px]:text-caption min-[640px]:tracking-[0.08em] ` +
        GRID_COLS
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
        shortLabel={girth === 'diameter' ? t('diameterShort') : t('circumferenceShort')}
        column="circumference"
        sort={sort}
        onSort={onSort}
        align="right"
      />
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
  sort: Sort | null;
  onSort: (column: SortColumn) => void;
  align?: 'right';
  className?: string;
}>) {
  const active = sort?.column === column;
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
          'transition-transform ' + (active ? 'opacity-100 ' : 'opacity-40 ') + (dir === 'desc' ? 'rotate-180' : '')
        }
      />
    </button>
  );
}

function ToyRow({
  toy,
  unit,
  open,
  onToggle,
  onEdit,
  onCopy,
  onDelete,
}: Readonly<{
  toy: Toy;
  unit: Unit;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
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
          GRID_COLS +
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
        <div
          ref={actionsRef}
          className="absolute right-3 top-1/2 hidden -translate-y-1/2 gap-1 rounded-md bg-surface/95 p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 sm:flex min-[640px]:right-4"
        >
          <ToyActionButtons onEdit={onEdit} onCopy={onCopy} onDelete={onDelete} />
        </div>
      </div>
      {open && <ExpandedPanel toy={toy} />}
    </>
  );
}

function Thumb({ toy }: Readonly<{ toy: Toy }>) {
  const editorToy = toyShapeToEditor(toy.shape);
  return (
    <ToyThumbnail
      toy={editorToy}
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

function ExpandedPanel({ toy }: Readonly<{ toy: Toy }>) {
  const { unit } = useUnit();
  const t = useTranslations();
  const locale = useLocale();
  const topShapeLabel = t(`shape.${toy.shape.topSectionShape ?? SectionShape.FLAT}`);
  return (
    <div className="border-b border-border bg-surface-secondary px-4 py-3.5 text-xs min-[640px]:px-5">
      <dl className="grid grid-cols-[90px_1fr] gap-x-3.5 gap-y-2">
        <dt className="text-caption font-semibold uppercase tracking-wider text-text-tertiary">
          {t('common.totalLength')}
        </dt>
        <dd className="text-foreground tabular-nums">
          {toy.totalLength == null ? (
            <span className="font-normal text-text-subtle">—</span>
          ) : (
            <>
              {formatValue(toy.totalLength, unit)}
              <span className="ml-1 text-caption font-medium text-muted">{unit.id}</span>
            </>
          )}
        </dd>

        <dt className="text-caption font-semibold uppercase tracking-wider text-text-tertiary">{t('toy.timesUsed')}</dt>
        <dd className="text-foreground tabular-nums">{toy.usageCount ?? 0}</dd>

        <dt className="text-caption font-semibold uppercase tracking-wider text-text-tertiary">{t('toy.timeUsed')}</dt>
        <dd className="text-foreground tabular-nums">{formatDuration(toy.totalDurationMinutes ?? 0, locale)}</dd>

        <dt className="text-caption font-semibold uppercase tracking-wider text-text-tertiary">
          {t('toy.columns.topShape')}
        </dt>
        <dd className="text-foreground">{topShapeLabel}</dd>

        <dt className="text-caption font-semibold uppercase tracking-wider text-text-tertiary">{t('common.color')}</dt>
        <dd className="inline-flex items-center gap-2 text-foreground">
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 rounded-sm border border-black/15"
            style={{ background: toy.color || DEFAULT_FILL }}
          />
          <span className="font-mono text-caption text-muted">{toy.color || '—'}</span>
        </dd>

        <dt className="text-caption font-semibold uppercase tracking-wider text-text-tertiary">
          {t('toy.columns.sections')}
        </dt>
        <dd>
          <div className="grid grid-cols-[auto_auto_auto_auto_1fr] gap-x-3 gap-y-0.5 font-mono text-caption text-foreground tabular-nums">
            {toy.shape.sections.map((s, idx) => (
              <SectionLine key={s.id} n={idx + 1} d={s.diameter} h={s.height} c={s.circumference ?? null} />
            ))}
            <span className="text-text-tertiary">+</span>
            <span className="italic text-muted col-span-4">{t('toy.topCap', { shape: topShapeLabel })}</span>
          </div>
        </dd>

        <dt className="text-caption font-semibold uppercase tracking-wider text-text-tertiary">
          {t('attributes.heading')}
        </dt>
        <dd>
          <AttributesPanel toy={toy} />
        </dd>
      </dl>
    </div>
  );
}

function SectionLine({ n, d, h, c }: Readonly<{ n: number; d: number; h: number; c: number | null }>) {
  const t = useTranslations('toy');
  const { girth } = useGirth();
  const girthValue = displayGirth(c, girth);
  return (
    <>
      <span className="text-text-tertiary">#{n}</span>
      <span className="whitespace-nowrap">{Math.round(d)} mm</span>
      <span className="text-text-tertiary">×</span>
      <span className="whitespace-nowrap">{Math.round(h)} mm</span>
      <span className="text-muted">
        {girthValue != null ? (
          <>
            <span className="whitespace-nowrap">{Math.round(girthValue)} mm</span>{' '}
            <span className="sm:hidden">{girth === 'diameter' ? t('diameterShort') : t('circumferenceShort')}</span>
            <span className="hidden sm:inline">
              {girth === 'diameter' ? t('diameterInline') : t('circumferenceInline')}
            </span>
          </>
        ) : (
          ''
        )}
      </span>
    </>
  );
}
