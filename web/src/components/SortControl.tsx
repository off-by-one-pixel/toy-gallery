'use client';

import { Dropdown } from '@heroui/react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useSortOf } from '../hooks/useSortOf';
import { cycleSort, type SortConfig } from '../services/sort';

type Props<C extends string> = Readonly<{
  config: SortConfig<C>;
  columnLabel: (column: C) => string;
}>;

export default function SortControl<C extends string>({ config, columnLabel }: Props<C>) {
  const { sort, setSort } = useSortOf(config);
  const t = useTranslations('sort');
  const activeLabel = sort ? columnLabel(sort.column) : t('label');
  const DirArrow = sort?.direction === 'desc' ? ArrowDown : ArrowUp;

  const flipDirection = () => {
    if (!sort) return;
    setSort({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
  };

  return (
    <div className="inline-flex items-stretch rounded-md border border-border bg-surface text-xs font-medium text-foreground shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <Dropdown>
        <Dropdown.Trigger className="inline-flex items-center gap-1.5 rounded-l-md px-2.5 py-1 transition-colors hover:bg-surface-secondary">
          <ArrowUpDown size={13} strokeWidth={2} className="text-muted" />
          <span>{activeLabel}</span>
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu selectedKeys={sort ? [sort.column] : []}>
            {config.columns.map((column) => (
              <Dropdown.Item key={column} id={column} onAction={() => setSort(cycleSort(sort, column))}>
                <SortRow label={columnLabel(column)} direction={sort?.column === column ? sort.direction : null} />
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      <button
        type="button"
        onClick={flipDirection}
        disabled={!sort}
        aria-label={sort?.direction === 'desc' ? t('ascending') : t('descending')}
        className="inline-flex items-center rounded-r-md border-l border-border px-2 transition-colors hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <DirArrow size={12} strokeWidth={2.4} className="text-muted" />
      </button>
    </div>
  );
}

function SortRow({ label, direction }: Readonly<{ label: string; direction: 'asc' | 'desc' | null }>) {
  const Arrow = direction === 'desc' ? ArrowDown : direction === 'asc' ? ArrowUp : null;
  return (
    <span className="flex w-full items-center justify-between gap-3">
      <span>{label}</span>
      {Arrow && <Arrow size={12} strokeWidth={2.2} className="text-muted" />}
    </span>
  );
}
