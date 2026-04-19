'use client';

import { Dropdown } from '@heroui/react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { useSort } from '../providers/SortProvider';
import { cycleSort, sortColumns, type SortColumn } from '../services/sort';

export default function SortControl() {
  const { sort, setSort } = useSort();
  const activeLabel = sort ? sortColumns.find((c) => c.id === sort.column)?.label : 'Sort';
  const DirArrow = sort?.direction === 'desc' ? ArrowDown : ArrowUp;

  const flipDirection = () => {
    if (!sort) return;
    setSort({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
  };

  return (
    <div className="inline-flex items-stretch rounded-md border border-neutral-200 bg-white text-xs font-medium text-neutral-700 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <Dropdown>
        <Dropdown.Trigger className="inline-flex items-center gap-1.5 rounded-l-md px-2.5 py-1 transition-colors hover:bg-neutral-50">
          <ArrowUpDown size={13} strokeWidth={2} className="text-neutral-500" />
          <span>{activeLabel}</span>
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu selectedKeys={sort ? [sort.column] : []}>
            {sortColumns.map((c) => (
              <Dropdown.Item key={c.id} id={c.id} onAction={() => setSort(cycleSort(sort, c.id as SortColumn))}>
                <SortRow label={c.label} direction={sort?.column === c.id ? sort.direction : null} />
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      <button
        type="button"
        onClick={flipDirection}
        disabled={!sort}
        aria-label={sort?.direction === 'desc' ? 'Sort ascending' : 'Sort descending'}
        className="inline-flex items-center rounded-r-md border-l border-neutral-200 px-2 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <DirArrow size={12} strokeWidth={2.4} className="text-neutral-500" />
      </button>
    </div>
  );
}

function SortRow({ label, direction }: { label: string; direction: 'asc' | 'desc' | null }) {
  const Arrow = direction === 'desc' ? ArrowDown : direction === 'asc' ? ArrowUp : null;
  return (
    <span className="flex w-full items-center justify-between gap-3">
      <span>{label}</span>
      {Arrow && <Arrow size={12} strokeWidth={2.2} className="text-neutral-500" />}
    </span>
  );
}
