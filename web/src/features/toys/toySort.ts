import type { Sort, SortConfig } from '@/lib/sort';
import type { Toy } from '@/api/types';
import { TOY_PROPERTIES, type ToyPropertyKey } from '@/features/toys/properties';

const ATTR_COLUMN_PREFIX = 'attr:';

export type ToySortColumn = ToyPropertyKey | `attr:${string}`;
export type ToySort = Sort<ToySortColumn>;

export const attrColumn = (key: string): ToySortColumn => `${ATTR_COLUMN_PREFIX}${key}`;

export const attrKeyOf = (column: string): string | null =>
  column.startsWith(ATTR_COLUMN_PREFIX) ? column.slice(ATTR_COLUMN_PREFIX.length) : null;

export const TOY_SORT: SortConfig<ToySortColumn> = {
  storageKey: 'gallery.sort',
  columns: Object.keys(TOY_PROPERTIES) as ToySortColumn[],
  defaultSort: { column: 'name', direction: 'asc' },
  extraColumnPrefix: ATTR_COLUMN_PREFIX,
};

export const SESSION_FORM_TOY_SORT: SortConfig<ToySortColumn> = {
  ...TOY_SORT,
  storageKey: 'session.toySort',
  extraColumnPrefix: undefined,
};

export const isToySortColumn = (v: unknown): v is ToySortColumn =>
  typeof v === 'string' && (v in TOY_PROPERTIES || v.startsWith(ATTR_COLUMN_PREFIX));

export const attributeSortColumns = (toys: readonly Toy[]): ToySortColumn[] => {
  const counts = new Map<string, number>();
  for (const toy of toys) {
    for (const key of Object.keys(toy.customAttributes ?? {})) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort(([keyA, countA], [keyB, countB]) => countB - countA || keyA.localeCompare(keyB))
    .map(([key]) => attrColumn(key));
};

export const galleryToySortConfig = (toys: readonly Toy[]): SortConfig<ToySortColumn> => ({
  ...TOY_SORT,
  columns: [...TOY_SORT.columns, ...attributeSortColumns(toys)],
});

const sortByAttribute = (toys: Toy[], key: string, mul: number): Toy[] => {
  const valueOf = (toy: Toy): string | undefined => toy.customAttributes?.[key];
  const present = toys.map(valueOf).filter((v): v is string => v !== undefined);
  const numeric = present.length > 0 && present.every((v) => v.trim() !== '' && !Number.isNaN(Number(v)));
  return toys.slice().sort((a, b) => {
    const av = valueOf(a);
    const bv = valueOf(b);
    if (av === undefined && bv === undefined) return 0;
    if (av === undefined) return 1;
    if (bv === undefined) return -1;
    const cmp = numeric ? Number(av) - Number(bv) : av.toLowerCase().localeCompare(bv.toLowerCase());
    return cmp * mul;
  });
};

export const sortToys = (toys: Toy[], sort: ToySort): Toy[] => {
  const mul = sort.direction === 'asc' ? 1 : -1;
  const attrKey = attrKeyOf(sort.column);
  if (attrKey !== null) return sortByAttribute(toys, attrKey, mul);
  const accessor = TOY_PROPERTIES[sort.column as ToyPropertyKey].sortValue;
  return toys.slice().sort((a, b) => {
    const av = accessor(a);
    const bv = accessor(b);
    if (av < bv) return -1 * mul;
    if (av > bv) return 1 * mul;
    return 0;
  });
};
