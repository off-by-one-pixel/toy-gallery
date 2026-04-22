import type { Toy } from './types';

export type SortColumn = 'name' | 'insertable' | 'circumference' | 'length' | 'diameter';
export type SortDirection = 'asc' | 'desc';
export type Sort = { column: SortColumn; direction: SortDirection };

export const sortColumns: readonly SortColumn[] = [
  'name',
  'insertable',
  'circumference',
  'length',
  'diameter',
];

const accessors: Record<SortColumn, (t: Toy) => number | string> = {
  name: (t) => `${t.brand} ${t.name}`.toLowerCase(),
  insertable: (t) => t.insertableLength ?? -Infinity,
  circumference: (t) => t.circumference ?? -Infinity,
  length: (t) => t.height,
  diameter: (t) => t.diameter,
};

export const sortToys = (toys: Toy[], sort: Sort | null): Toy[] => {
  if (!sort) return toys;
  const accessor = accessors[sort.column];
  const mul = sort.direction === 'asc' ? 1 : -1;
  return toys.slice().sort((a, b) => {
    const av = accessor(a);
    const bv = accessor(b);
    if (av < bv) return -1 * mul;
    if (av > bv) return 1 * mul;
    return 0;
  });
};

// Click-same-column → flip direction; click new column → asc.
export const cycleSort = (current: Sort | null, column: SortColumn): Sort =>
  current?.column === column
    ? { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { column, direction: 'asc' };
