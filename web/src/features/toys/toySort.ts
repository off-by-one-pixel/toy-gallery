import type { Sort, SortConfig } from '@/lib/sort';
import type { Toy } from '@/api/types';
import { TOY_PROPERTIES, type ToyPropertyKey } from '@/features/toys/properties';

export type ToySortColumn = ToyPropertyKey;
export type ToySort = Sort<ToySortColumn>;

export const TOY_SORT: SortConfig<ToySortColumn> = {
  storageKey: 'gallery.sort',
  columns: Object.keys(TOY_PROPERTIES) as ToySortColumn[],
};

export const SESSION_FORM_TOY_SORT: SortConfig<ToySortColumn> = {
  ...TOY_SORT,
  storageKey: 'session.toySort',
};

export const isToySortColumn = (v: unknown): v is ToySortColumn => typeof v === 'string' && v in TOY_PROPERTIES;

export const sortToys = (toys: Toy[], sort: ToySort | null): Toy[] => {
  if (!sort) return toys;
  const accessor = TOY_PROPERTIES[sort.column].sortValue;
  const mul = sort.direction === 'asc' ? 1 : -1;
  return toys.slice().sort((a, b) => {
    const av = accessor(a);
    const bv = accessor(b);
    if (av < bv) return -1 * mul;
    if (av > bv) return 1 * mul;
    return 0;
  });
};
