'use client';

import { useSort } from '@/providers/SortProvider';
import { narrowSort, type Sort, type SortConfig } from '@/lib/sort';

export function useSortOf<C extends string>(
  config: SortConfig<C>,
): {
  sort: Sort<C> | null;
  setSort: (sort: Sort<C> | null) => void;
} {
  const { sort, setSort } = useSort();
  return { sort: narrowSort(config, sort), setSort };
}
