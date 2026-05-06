import type { Toy } from './types';

type ColumnConfig = {
  label: string;
  accessor: (t: Toy) => number | string;
};

const COLUMNS = {
  name: {
    label: 'Brand / Model',
    accessor: (t) => `${t.brand} ${t.name}`.toLowerCase(),
  },
  insertable: {
    label: 'Insertable',
    accessor: (t) => t.insertableLength ?? -Infinity,
  },
  total: {
    label: 'Total length',
    accessor: (t) => t.totalLength ?? -Infinity,
  },
  circumference: {
    label: 'Circumference',
    accessor: (t) => t.circumference ?? -Infinity,
  },
} as const satisfies Record<string, ColumnConfig>;

export type SortColumn = keyof typeof COLUMNS;
export type SortDirection = 'asc' | 'desc';
export type Sort = { column: SortColumn; direction: SortDirection };

export const sortColumns = Object.keys(COLUMNS) as SortColumn[];

export const sortColumnLabel = (column: SortColumn): string => COLUMNS[column].label;

export const isSortColumn = (v: unknown): v is SortColumn => typeof v === 'string' && v in COLUMNS;

export const sortToys = (toys: Toy[], sort: Sort | null): Toy[] => {
  if (!sort) return toys;
  const accessor = COLUMNS[sort.column].accessor;
  const mul = sort.direction === 'asc' ? 1 : -1;
  return toys.slice().sort((a, b) => {
    const av = accessor(a);
    const bv = accessor(b);
    if (av < bv) return -1 * mul;
    if (av > bv) return 1 * mul;
    return 0;
  });
};

// Click-same-column → flip direction; click new column → keep current direction.
export const cycleSort = (current: Sort | null, column: SortColumn): Sort =>
  current?.column === column
    ? { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { column, direction: current?.direction ?? 'asc' };
