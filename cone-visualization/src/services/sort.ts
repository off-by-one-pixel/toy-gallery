import type { Toy } from './types';

export type SortColumn = 'name' | 'insertable' | 'circumference' | 'length' | 'diameter';
export type SortDirection = 'asc' | 'desc';
export type Sort = { column: SortColumn; direction: SortDirection };

export const sortColumns: { id: SortColumn; label: string }[] = [
  { id: 'name', label: 'Brand / Model' },
  { id: 'insertable', label: 'Insertable' },
  { id: 'circumference', label: 'Circumference' },
  { id: 'length', label: 'Length' },
  { id: 'diameter', label: 'Diameter' },
];

const accessors: Record<SortColumn, (t: Toy) => number | string> = {
  name: (t) => `${t.brand} ${t.name}`.toLowerCase(),
  insertable: (t) => t.insertableLength?.mm ?? -Infinity,
  circumference: (t) => t.circumference?.mm ?? -Infinity,
  length: (t) => t.height.mm,
  diameter: (t) => t.diameter.mm,
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
