import {
  SESSION_FILTER_ALL,
  SESSION_FILTER_MONTH,
  SESSION_FILTER_MONTH_SHORT,
  SESSION_FILTER_WEEK,
  SESSION_FILTER_WEEK_SHORT,
} from '../labels';
import { Involvement, type Session, type SessionEntry, type Toy } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

// -------- Date helpers --------

/** Human-readable "when" label for a session timestamp:
 *  `Today · 3:45 PM`, `Yesterday · 9:00 AM`, or `Mar 5 · 2:00 PM`.
 *  Locale-aware. Pass `now` for deterministic tests. */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / DAY_MS);
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Yesterday · ${time}`;
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
  label: string;
  /** Compact label used on narrow viewports; falls back to `label` when absent. */
  shortLabel?: string;
  /** Number of days the filter accepts. `null` means no upper bound. */
  days: number | null;
}>;

export const FILTERS: readonly FilterOption[] = [
  { key: 'all', label: SESSION_FILTER_ALL, days: null },
  { key: 'week', label: SESSION_FILTER_WEEK, shortLabel: SESSION_FILTER_WEEK_SHORT, days: 7 },
  { key: 'month', label: SESSION_FILTER_MONTH, shortLabel: SESSION_FILTER_MONTH_SHORT, days: 30 },
];

/** Filter sessions by recency. Pass `now` for deterministic tests. */
export function filterSessions(sessions: readonly Session[], filter: FilterKey, now: Date = new Date()): Session[] {
  const option = FILTERS.find((f) => f.key === filter);
  if (option?.days == null) return [...sessions];
  const days = option.days;
  return sessions.filter((s) => isWithin(s.startedAt, days, now));
}

/** Look up the human label for a filter key. */
export function filterLabel(filter: FilterKey): string {
  return FILTERS.find((f) => f.key === filter)?.label ?? '';
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
