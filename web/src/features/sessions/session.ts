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

type SessionFlagFilterDef = Readonly<{
  urlParam: string;
  keyToken: string;
  wireParam: 'has_media' | 'has_pr';
  labelKey: string;
}>;

export const SESSION_FLAG_FILTERS = {
  hasMedia: { urlParam: 'media', keyToken: 'm', wireParam: 'has_media', labelKey: 'hasMedia' },
  hasPr: { urlParam: 'pr', keyToken: 'r', wireParam: 'has_pr', labelKey: 'hasPr' },
} as const satisfies Record<string, SessionFlagFilterDef>;

export type SessionFlagKey = keyof typeof SESSION_FLAG_FILTERS;

export const SESSION_FLAG_KEYS = Object.keys(SESSION_FLAG_FILTERS) as readonly SessionFlagKey[];

export type SessionFilters = Readonly<{ toyIds: readonly number[] } & Record<SessionFlagKey, boolean>>;

const NO_FLAGS = Object.fromEntries(SESSION_FLAG_KEYS.map((key) => [key, false])) as Record<SessionFlagKey, boolean>;

export const NO_SESSION_FILTERS: SessionFilters = { toyIds: [], ...NO_FLAGS };

export const activeFlagKeys = (filters: SessionFilters): SessionFlagKey[] =>
  SESSION_FLAG_KEYS.filter((key) => filters[key]);

export const sessionFiltersKey = (filters: SessionFilters): string =>
  [
    filters.toyIds.join(','),
    activeFlagKeys(filters)
      .map((key) => SESSION_FLAG_FILTERS[key].keyToken)
      .join(''),
  ].join('|');

export const activeFilterCount = (filters: SessionFilters): number =>
  filters.toyIds.length + activeFlagKeys(filters).length;

export const toggleToyFilter = (filters: SessionFilters, toyId: number): SessionFilters => ({
  ...filters,
  toyIds: filters.toyIds.includes(toyId) ? filters.toyIds.filter((id) => id !== toyId) : [...filters.toyIds, toyId],
});

export const toggleFlagFilter = (filters: SessionFilters, key: SessionFlagKey): SessionFilters => ({
  ...filters,
  [key]: !filters[key],
});

export const parseSessionFilters = (get: (name: string) => string | null): SessionFilters => ({
  toyIds: parseToyIdsParam(get('toys')),
  ...(Object.fromEntries(
    SESSION_FLAG_KEYS.map((key) => [key, get(SESSION_FLAG_FILTERS[key].urlParam) === '1']),
  ) as Record<SessionFlagKey, boolean>),
});

export const sessionFiltersUrlParams = (filters: SessionFilters): Record<string, string | null> => ({
  toys: filters.toyIds.length > 0 ? filters.toyIds.join(',') : null,
  ...Object.fromEntries(
    SESSION_FLAG_KEYS.map((key) => [SESSION_FLAG_FILTERS[key].urlParam, filters[key] ? '1' : null]),
  ),
});

export const sessionFilterWireParams = (
  filters: SessionFilters,
): Partial<Record<SessionFlagFilterDef['wireParam'], boolean>> =>
  Object.fromEntries(activeFlagKeys(filters).map((key) => [SESSION_FLAG_FILTERS[key].wireParam, true]));

export const parseToyIdsParam = (value: string | null): number[] =>
  value
    ? value
        .split(',')
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    : [];
