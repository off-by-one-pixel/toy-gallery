'use client';

import { useRef } from 'react';
import { Chip } from '@heroui/react';
import { ChevronDown } from 'lucide-react';
import { ThumbnailRender } from 'cone-editor';

import { ATTRIBUTES_HEADING, SHAPE_LABEL, TOY_CIRCUMFERENCE, TOY_CIRCUMFERENCE_SHORT } from '../labels';
import { useSort } from '../providers/SortProvider';
import { useUnit } from '../providers/UnitProvider';
import { toyShapeToEditor } from '../services/converters/toyShape';
import { cycleSort, type Sort, type SortColumn } from '../services/sort';
import { formatValue, type Unit } from '../services/units';
import { SectionShape, type Toy } from '../services/types';
import AttributesPanel from './AttributesPanel';
import ToyActionButtons from './ToyActionButtons';

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
  const { sort, setSort } = useSort();
  const handleSort = (column: SortColumn) => setSort(cycleSort(sort, column));

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
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
  return (
    <div
      className={
        `grid items-center gap-x-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-neutral-400 min-[640px]:gap-x-3.5 min-[640px]:px-5 min-[640px]:text-[10px] min-[640px]:tracking-[0.08em] ` +
        GRID_COLS
      }
    >
      <span />
      <SortHeader label="Brand / Model" shortLabel="Model" column="name" sort={sort} onSort={onSort} />
      <span className={HIDDEN_SIZE}>Size</span>
      <SortHeader label="Insertable" shortLabel="Ins" column="insertable" sort={sort} onSort={onSort} align="right" />
      <SortHeader
        label="Circumference"
        shortLabel="Circ"
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
      className={`inline-flex items-center gap-1 whitespace-nowrap uppercase transition-colors hover:text-neutral-500 ${
        active ? 'text-neutral-700' : ''
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
          `group relative grid cursor-pointer items-center gap-x-3 border-b border-neutral-200 px-4 py-2.5 transition-colors hover:bg-neutral-50 min-[640px]:gap-x-3.5 min-[640px]:px-5 ` +
          GRID_COLS +
          (open ? ' bg-blue-50/50' : '')
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
        <Metric value={toy.circumference} unit={unit} />
        <div
          ref={actionsRef}
          className="absolute right-3 top-1/2 hidden -translate-y-1/2 gap-1 rounded-md bg-white/95 p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 sm:flex min-[640px]:right-4"
        >
          <ToyActionButtons onEdit={onEdit} onCopy={onCopy} onDelete={onDelete} />
        </div>
      </div>
      {open && <ExpandedPanel toy={toy} />}
    </>
  );
}

function Thumb({ toy }: Readonly<{ toy: Toy }>) {
  const style = {
    borderWidth: 1,
    borderColor: '#1f2937',
    color: toy.color || DEFAULT_FILL,
  };
  const editorToy = toyShapeToEditor(toy.shape);
  return (
    <div className="flex h-15 w-12 items-end justify-center rounded-md border border-neutral-200 bg-linear-to-br from-[#fafaff] to-[#f0fdfa] p-1">
      <ThumbnailRender toy={editorToy} scaleFactor={1} style={style} />
    </div>
  );
}

function NameCol({ toy }: Readonly<{ toy: Toy }>) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[10px] font-normal uppercase tracking-[0.06em] text-neutral-500 min-[640px]:text-[11px]">
        {toy.brand}
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-sm font-semibold text-neutral-900 min-[640px]:text-base">{toy.name}</span>
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
        muted ? 'font-medium text-neutral-500' : 'text-neutral-900'
      } ${className ?? ''}`}
    >
      {value == null ? (
        <span className="font-normal text-neutral-300">—</span>
      ) : (
        <>
          {formatValue(value, unit)}
          <span className="ml-1.5 text-[11px] font-medium text-neutral-500">{unit.id}</span>
        </>
      )}
    </div>
  );
}

function ExpandedPanel({ toy }: Readonly<{ toy: Toy }>) {
  const { unit } = useUnit();
  return (
    <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3.5 text-xs min-[640px]:px-5">
      <dl className="grid grid-cols-[90px_1fr] gap-x-3.5 gap-y-2">
        <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Total length</dt>
        <dd className="text-neutral-900 tabular-nums">
          {toy.totalLength == null ? (
            <span className="font-normal text-neutral-300">—</span>
          ) : (
            <>
              {formatValue(toy.totalLength, unit)}
              <span className="ml-1 text-[10px] font-medium text-neutral-500">{unit.id}</span>
            </>
          )}
        </dd>

        <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Top shape</dt>
        <dd className="text-neutral-900">{SHAPE_LABEL[toy.shape.topSectionShape ?? SectionShape.FLAT]}</dd>

        <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Color</dt>
        <dd className="inline-flex items-center gap-2 text-neutral-900">
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 rounded-sm border border-black/15"
            style={{ background: toy.color || DEFAULT_FILL }}
          />
          <span className="font-mono text-[11px] text-neutral-600">{toy.color || '—'}</span>
        </dd>

        <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Sections</dt>
        <dd>
          <div className="grid grid-cols-[auto_auto_auto_auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px] text-neutral-800 tabular-nums">
            {toy.shape.sections.map((s, idx) => (
              <SectionLine key={s.id} n={idx + 1} d={s.diameter} h={s.height} c={s.circumference ?? null} />
            ))}
            <span className="text-neutral-400">+</span>
            <span className="italic text-neutral-500 col-span-4">
              {SHAPE_LABEL[toy.shape.topSectionShape ?? SectionShape.FLAT]} cap
            </span>
          </div>
        </dd>

        <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{ATTRIBUTES_HEADING}</dt>
        <dd>
          <AttributesPanel toy={toy} />
        </dd>
      </dl>
    </div>
  );
}

function SectionLine({ n, d, h, c }: Readonly<{ n: number; d: number; h: number; c: number | null }>) {
  return (
    <>
      <span className="text-neutral-400">#{n}</span>
      <span className="whitespace-nowrap">{Math.round(d)} mm</span>
      <span className="text-neutral-400">×</span>
      <span className="whitespace-nowrap">{Math.round(h)} mm</span>
      <span className="text-neutral-600">
        {c != null ? (
          <>
            <span className="whitespace-nowrap">{Math.round(c)} mm</span>{' '}
            <span className="sm:hidden">{TOY_CIRCUMFERENCE_SHORT}</span>
            <span className="hidden sm:inline">{TOY_CIRCUMFERENCE}</span>
          </>
        ) : (
          ''
        )}
      </span>
    </>
  );
}
