'use client';

import { Button, Chip } from '@heroui/react';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { Render } from 'cone-editor';
import type { Toy as EditorToy } from 'cone-editor';

import { useSort } from '../providers/SortProvider';
import { useUnit } from '../providers/UnitProvider';
import { cycleSort, type Sort, type SortColumn } from '../services/sort';
import { formatValue, type Unit } from '../services/units';
import { SectionShape, type Toy } from '../services/types';

const DEFAULT_FILL = '#c7e4ee';

const GRID_COLS =
  'grid-cols-[44px_2fr_1fr_1fr_40px] ' +
  'min-[640px]:grid-cols-[48px_2fr_70px_1fr_1fr_76px] ' +
  'min-[900px]:grid-cols-[56px_2fr_70px_100px_120px_100px_100px_76px]';

// SortHeader buttons need `inline-flex` at the breakpoint so the chevron
// stays inline; plain cells can use `block`.
const HIDDEN_SIZE = 'hidden min-[640px]:block';
const HIDDEN_LENGTH = 'hidden min-[900px]:block';
const HIDDEN_DIAMETER = 'hidden min-[900px]:block';
const HIDDEN_LENGTH_HEADER = 'hidden min-[900px]:inline-flex';
const HIDDEN_DIAMETER_HEADER = 'hidden min-[900px]:inline-flex';

type Props = {
  toys: Toy[];
  openToyId: number | null;
  onToggleOpen: (id: number) => void;
  onEdit: (toy: Toy) => void;
  onDelete: (toy: Toy) => void;
};

export default function ToyList({ toys, openToyId, onToggleOpen, onEdit, onDelete }: Props) {
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
          onDelete={() => onDelete(toy)}
        />
      ))}
    </div>
  );
}

function ListHeader({ sort, onSort }: { sort: Sort | null; onSort: (column: SortColumn) => void }) {
  return (
    <div
      className={
        `grid items-center gap-x-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400 min-[640px]:gap-x-3.5 min-[640px]:px-5 ` +
        GRID_COLS
      }
    >
      <span />
      <SortHeader label="Brand / Model" column="name" sort={sort} onSort={onSort} />
      <span className={HIDDEN_SIZE}>Size</span>
      <SortHeader label="Insertable" column="insertable" sort={sort} onSort={onSort} align="right" />
      <SortHeader label="Circumference" column="circumference" sort={sort} onSort={onSort} align="right" />
      <SortHeader
        label="Length"
        column="length"
        sort={sort}
        onSort={onSort}
        align="right"
        className={HIDDEN_LENGTH_HEADER}
      />
      <SortHeader
        label="Diameter"
        column="diameter"
        sort={sort}
        onSort={onSort}
        align="right"
        className={HIDDEN_DIAMETER_HEADER}
      />
      <span />
    </div>
  );
}

function SortHeader({
  label,
  column,
  sort,
  onSort,
  align,
  className,
}: {
  label: string;
  column: SortColumn;
  sort: Sort | null;
  onSort: (column: SortColumn) => void;
  align?: 'right';
  className?: string;
}) {
  const active = sort?.column === column;
  const dir = active ? sort!.direction : null;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`inline-flex items-center gap-1 whitespace-nowrap uppercase transition-colors hover:text-neutral-500 ${
        active ? 'text-neutral-700' : ''
      } ${align === 'right' ? 'justify-end' : ''} ${className ?? ''}`}
    >
      <span className="whitespace-nowrap">{label}</span>
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
  onDelete,
}: {
  toy: Toy;
  unit: Unit;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className={
          `group grid cursor-pointer items-center gap-x-3 border-b border-neutral-200 px-4 py-2.5 transition-colors hover:bg-neutral-50 min-[640px]:gap-x-3.5 min-[640px]:px-5 ` +
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
        <Metric value={toy.height} unit={unit} muted className={HIDDEN_LENGTH} />
        <Metric value={toy.diameter} unit={unit} muted className={HIDDEN_DIAMETER} />
        <div
          className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="outline" size="sm" isIconOnly aria-label="Edit" onPress={onEdit}>
            <Pencil size={13} strokeWidth={1.8} />
          </Button>
          <Button variant="danger-soft" size="sm" isIconOnly aria-label="Delete" onPress={onDelete}>
            <Trash2 size={13} strokeWidth={1.8} />
          </Button>
        </div>
      </div>
      {open && <ExpandedPanel toy={toy} />}
    </>
  );
}

function Thumb({ toy }: { toy: Toy }) {
  const style = {
    borderWidth: 1,
    borderColor: '#1f2937',
    color: toy.color || DEFAULT_FILL,
  };
  const editorToy: EditorToy = {
    sections: toy.shape.sections,
    topShape: toy.shape.topSectionShape ?? SectionShape.FLAT,
    bottomShape: toy.shape.bottomSectionShape ?? SectionShape.FLAT,
  };
  return (
    <div className="flex h-15 w-12 items-end justify-center rounded-md border border-neutral-200 bg-linear-to-br from-[#fafaff] to-[#f0fdfa] p-1">
      <Render toy={editorToy} scaleFactor={1} style={style} interactive={false} />
    </div>
  );
}

function NameCol({ toy }: { toy: Toy }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[11px] font-normal uppercase tracking-[0.06em] text-neutral-500">{toy.brand}</div>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-base font-semibold text-neutral-900">{toy.name}</span>
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
}: {
  value: number | null | undefined;
  unit: Unit;
  muted?: boolean;
  className?: string;
}) {
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

function ExpandedPanel({ toy }: { toy: Toy }) {
  return (
    <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3.5 pl-18 text-xs min-[640px]:px-5 min-[640px]:pl-19 min-[900px]:pl-21">
      <dl className="grid grid-cols-[90px_1fr] gap-x-3.5 gap-y-2">
        <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Top shape</dt>
        <dd className="text-neutral-900">{toy.shape.topSectionShape === SectionShape.EGG ? 'Egg' : 'Cone'}</dd>

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
              {toy.shape.topSectionShape === SectionShape.EGG ? 'Egg' : 'Cone'} cap
            </span>
          </div>
        </dd>
      </dl>
    </div>
  );
}

function SectionLine({ n, d, h, c }: { n: number; d: number; h: number; c: number | null }) {
  return (
    <>
      <span className="text-neutral-400">#{n}</span>
      <span>{Math.round(d)} mm</span>
      <span className="text-neutral-400">×</span>
      <span>{Math.round(h)} mm</span>
      <span className="text-neutral-600">{c != null ? `${Math.round(c)} mm circumference` : ''}</span>
    </>
  );
}
