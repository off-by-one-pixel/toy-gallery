import { daysAgoDateString } from './dates';
import { Involvement, type Session, type SessionEntry, type Toy } from './types';

// -------- Filter --------

export type FilterKey = 'all' | 'week' | 'month';

export type FilterOption = Readonly<{
  key: FilterKey;
  /** Number of days the filter accepts. `null` means no upper bound. */
  days: number | null;
  /** Whether this filter has a short-label variant for narrow viewports. */
  hasShortLabel: boolean;
}>;

export const FILTERS: readonly FilterOption[] = [
  { key: 'all', days: null, hasShortLabel: false },
  { key: 'week', days: 7, hasShortLabel: true },
  { key: 'month', days: 30, hasShortLabel: true },
];

/** Filter sessions by recency. Pass `now` for deterministic tests. */
export const SESSION_SORT_COLUMNS = ['started_at', 'duration', 'length', 'circumference'] as const;
export type SessionSortColumn = (typeof SESSION_SORT_COLUMNS)[number];

export type SessionSort = Readonly<{ column: string; direction: 'asc' | 'desc' }>;

export function sessionOrderingParam(sort: SessionSort | null): string | undefined {
  if (!sort || !(SESSION_SORT_COLUMNS as readonly string[]).includes(sort.column)) return undefined;
  return sort.direction === 'desc' ? `-${sort.column}` : sort.column;
}

export function mergeSessions(existing: readonly Session[], incoming: readonly Session[]): Session[] {
  const seen = new Set(existing.map((s) => s.id));
  return [...existing, ...incoming.filter((s) => !seen.has(s.id))];
}

export function filterStartDate(filter: FilterKey, now: Date = new Date()): string | undefined {
  const days = FILTERS.find((f) => f.key === filter)?.days;
  if (days == null) return undefined;
  return daysAgoDateString(days, now);
}

// -------- Entry sort --------

/** Sort priority within a session: USED first (smallest impact),
 *  then INSERTED, then FULLY_INSERTED. Visual layout uses this. */
export const INVOLVEMENT_RANK: Record<Involvement, number> = {
  [Involvement.USED]: 0,
  [Involvement.INSERTED]: 1,
  [Involvement.FULLY_INSERTED]: 2,
};

/** Stable sort of a session's entries by involvement rank. */
export function sortEntriesByInvolvement(entries: readonly SessionEntry[]): SessionEntry[] {
  return [...entries].sort((a, b) => INVOLVEMENT_RANK[a.involvement] - INVOLVEMENT_RANK[b.involvement]);
}

// -------- Toy lookup --------

/** Build an id → toy lookup map. */
export function toysById(toys: readonly Toy[]): Map<number, Toy> {
  return new Map(toys.map((t) => [t.id, t]));
}

/** Combine brand + model + size into one whitespace-trimmed tooltip
 *  string. Empty parts are dropped. */
export function toyTooltip(toy: Toy): string {
  return [toy.brand, toy.name, toy.size].filter(Boolean).join(' ');
}
