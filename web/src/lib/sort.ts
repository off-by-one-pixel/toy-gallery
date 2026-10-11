type SortDirection = 'asc' | 'desc';
export type Sort<C extends string = string> = Readonly<{ column: C; direction: SortDirection }>;

export interface SortConfig<C extends string = string> {
  readonly storageKey: string;
  readonly columns: readonly C[];
  readonly defaultSort: Sort<C>;
  readonly extraColumnPrefix?: string;
}

export const cycleSort = <C extends string>(current: Sort<C>, column: C): Sort<C> =>
  current.column === column
    ? { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { column, direction: current.direction };

export const isColumnOf = <C extends string>(config: SortConfig<C>, value: unknown): value is C =>
  typeof value === 'string' &&
  ((config.columns as readonly string[]).includes(value) ||
    (config.extraColumnPrefix !== undefined && value.startsWith(config.extraColumnPrefix)));

export const narrowSort = <C extends string>(config: SortConfig<C>, sort: Sort | null): Sort<C> =>
  sort && isColumnOf(config, sort.column) ? (sort as Sort<C>) : config.defaultSort;

export const isValidSort = (value: unknown, config: SortConfig): value is Sort => {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as { column?: unknown; direction?: unknown };
  return isColumnOf(config, s.column) && (s.direction === 'asc' || s.direction === 'desc');
};
