import type { Sort, SortConfig } from '@/lib/sort';

const SESSION_SORT_COLUMNS = ['started_at', 'duration', 'length', 'circumference'] as const;
export type SessionSortColumn = (typeof SESSION_SORT_COLUMNS)[number];
export type SessionSort = Sort<SessionSortColumn>;

export const SESSION_SORT: SortConfig<SessionSortColumn> = {
  storageKey: 'sessions.sort',
  columns: SESSION_SORT_COLUMNS,
};

export function sessionOrderingParam(sort: SessionSort | null): string | undefined {
  if (!sort) return undefined;
  return sort.direction === 'desc' ? `-${sort.column}` : sort.column;
}
