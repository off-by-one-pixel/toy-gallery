import type { Toy } from './types';

type Accessor = (t: Toy) => number | string;

const COLUMNS = {
  name: (t: Toy) => `${t.brand} ${t.name}`.toLowerCase(),
  insertable: (t: Toy) => t.insertableLength ?? -Infinity,
  total: (t: Toy) => t.totalLength ?? -Infinity,
  circumference: (t: Toy) => t.circumference ?? -Infinity,
  popularity: (t: Toy) => t.usageCount ?? 0,
  duration: (t: Toy) => t.totalDurationMinutes ?? 0,
} as const satisfies Record<string, Accessor>;

export type SortColumn = keyof typeof COLUMNS;
export type SortDirection = 'asc' | 'desc';
export type Sort = { column: string; direction: SortDirection };

export const sortColumns = Object.keys(COLUMNS) as SortColumn[];

export const isSortColumn = (v: unknown): v is SortColumn => typeof v === 'string' && v in COLUMNS;

export const sortToys = (toys: Toy[], sort: Sort | null): Toy[] => {
  if (!sort || !isSortColumn(sort.column)) return toys;
  const accessor = COLUMNS[sort.column];
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
export const cycleSort = (current: Sort | null, column: string): Sort =>
  current?.column === column
    ? { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { column, direction: current?.direction ?? 'asc' };
