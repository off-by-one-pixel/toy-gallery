import { daysAgoDateString } from '@/lib/dates';
import { Involvement, type Session, type SessionEntry, type Toy } from '@/api/types';

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

export const INVOLVEMENT_RANK: Record<Involvement, number> = {
  [Involvement.FULLY_INSERTED]: 0,
  [Involvement.INSERTED]: 1,
  [Involvement.USED]: 2,
};

export function sortEntriesByInvolvement(
  entries: readonly SessionEntry[],
  toys: ReadonlyMap<number, Toy>,
): SessionEntry[] {
  const girthOf = (entry: SessionEntry) => toys.get(entry.toy)?.circumference ?? -1;
  return [...entries].sort(
    (a, b) => INVOLVEMENT_RANK[a.involvement] - INVOLVEMENT_RANK[b.involvement] || girthOf(b) - girthOf(a),
  );
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

export type SessionFilters = Readonly<{
  toyIds: readonly number[];
  hasPhotos: boolean;
  hasVideos: boolean;
}>;

export const NO_SESSION_FILTERS: SessionFilters = { toyIds: [], hasPhotos: false, hasVideos: false };

export const activeFilterCount = (filters: SessionFilters): number =>
  filters.toyIds.length + (filters.hasPhotos ? 1 : 0) + (filters.hasVideos ? 1 : 0);

export const toggleToyFilter = (filters: SessionFilters, toyId: number): SessionFilters => ({
  ...filters,
  toyIds: filters.toyIds.includes(toyId) ? filters.toyIds.filter((id) => id !== toyId) : [...filters.toyIds, toyId],
});
