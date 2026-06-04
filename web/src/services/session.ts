import { Involvement, type Session, type SessionEntry, type Toy } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

// -------- Date helpers --------

/** Human-readable "when" label for a session timestamp:
 *  `Today · 3:45 PM`, `Yesterday · 9:00 AM`, or `Mar 5 · 2:00 PM`.
 *  Locale-aware: `locale` drives Intl date/time formatting; `t` supplies
 *  the `Today` / `Yesterday` literals. Pass `now` for deterministic tests. */
export function formatWhen(iso: string, now: Date, locale: string, t: (key: 'today' | 'yesterday') => string): string {
  const d = new Date(iso);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / DAY_MS);
  const time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 0) return `${t('today')} · ${time}`;
  if (diffDays === 1) return `${t('yesterday')} · ${time}`;
  const date = d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  return `${date} · ${time}`;
}

/** Is `iso` within the last `days` (relative to `now`)? Pure. */
export function isWithin(iso: string, days: number, now: Date = new Date()): boolean {
  const t = new Date(iso).getTime();
  return now.getTime() - t <= days * DAY_MS;
}

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
export function filterSessions(sessions: readonly Session[], filter: FilterKey, now: Date = new Date()): Session[] {
  const option = FILTERS.find((f) => f.key === filter);
  if (option?.days == null) return [...sessions];
  const days = option.days;
  return sessions.filter((s) => isWithin(s.startedAt, days, now));
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
