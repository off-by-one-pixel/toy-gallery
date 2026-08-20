import type { Sort, SortConfig } from './sort';
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

export type ToySortColumn = keyof typeof COLUMNS;
export type ToySort = Sort<ToySortColumn>;

export const TOY_SORT: SortConfig<ToySortColumn> = {
  storageKey: 'gallery.sort',
  columns: Object.keys(COLUMNS) as ToySortColumn[],
};

export const SESSION_FORM_TOY_SORT: SortConfig<ToySortColumn> = {
  ...TOY_SORT,
  storageKey: 'session.toySort',
};

export const isToySortColumn = (v: unknown): v is ToySortColumn => typeof v === 'string' && v in COLUMNS;

export const sortToys = (toys: Toy[], sort: ToySort | null): Toy[] => {
  if (!sort) return toys;
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
