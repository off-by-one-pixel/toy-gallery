import { Involvement, type Session, type SessionEntry, type Toy } from '@/api/types';
import type { MessageKey } from '@/i18n/translator';
import { localDateKey } from '@/lib/dates';

export type FilterKey = 'all' | 'week' | 'month';

export const FILTERS: readonly FilterKey[] = ['all', 'month', 'week'];

export function mergeSessions(existing: readonly Session[], incoming: readonly Session[]): Session[] {
  const seen = new Set(existing.map((s) => s.id));
  return [...existing, ...incoming.filter((s) => !seen.has(s.id))];
}

export type Period = Readonly<{ kind: 'all' }> | Readonly<{ kind: 'week' | 'month'; anchor: string }>;

export const ALL_PERIOD: Period = { kind: 'all' };

const parseAnchor = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d ?? 1);
};

const startOfWeek = (d: Date): Date => {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
};

const anchorFor = (kind: 'week' | 'month', d: Date): string =>
  kind === 'week' ? localDateKey(startOfWeek(d)) : localDateKey(new Date(d.getFullYear(), d.getMonth(), 1));

export function currentPeriod(kind: FilterKey, now: Date = new Date()): Period {
  if (kind === 'all') return ALL_PERIOD;
  return { kind, anchor: anchorFor(kind, now) };
}

const shiftAnchor = (period: Period, step: number): Date => {
  if (period.kind === 'all') return new Date();
  const anchor = parseAnchor(period.anchor);
  if (period.kind === 'week') anchor.setDate(anchor.getDate() + step * 7);
  else anchor.setMonth(anchor.getMonth() + step);
  return anchor;
};

export function canStepForward(period: Period, now: Date = new Date()): boolean {
  if (period.kind === 'all') return false;
  return period.anchor < anchorFor(period.kind, now);
}

export function stepPeriod(period: Period, step: 1 | -1, now: Date = new Date()): Period {
  if (period.kind === 'all') return period;
  if (step === 1 && !canStepForward(period, now)) return period;
  return { kind: period.kind, anchor: localDateKey(shiftAnchor(period, step)) };
}

const lastDay = (period: Period): Date => {
  const day = shiftAnchor(period, 1);
  day.setDate(day.getDate() - 1);
  return day;
};

export function periodRange(period: Period): Readonly<{ start?: string; end?: string }> {
  if (period.kind === 'all') return {};
  return { start: period.anchor, end: localDateKey(lastDay(period)) };
}

export function periodUrlParam(period: Period): string | null {
  if (period.kind === 'all') return null;
  return period.kind === 'week' ? `w${period.anchor}` : `m${period.anchor.slice(0, 7)}`;
}

export function parsePeriodParam(raw: string | null, now: Date = new Date()): Period {
  if (raw && /^w\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const period: Period = { kind: 'week', anchor: anchorFor('week', parseAnchor(raw.slice(1))) };
    return canStepForward(period, now) || period.anchor === anchorFor('week', now)
      ? period
      : currentPeriod('week', now);
  }
  if (raw && /^m\d{4}-\d{2}$/.test(raw)) {
    const period: Period = { kind: 'month', anchor: `${raw.slice(1)}-01` };
    return canStepForward(period, now) || period.anchor === anchorFor('month', now)
      ? period
      : currentPeriod('month', now);
  }
  return ALL_PERIOD;
}

export function periodLabel(period: Period, locale: string, now: Date = new Date()): string {
  if (period.kind === 'all') return '';
  const start = parseAnchor(period.anchor);
  const sameYear = start.getFullYear() === now.getFullYear();
  if (period.kind === 'month') {
    return start.toLocaleDateString(locale, { month: 'long', year: sameYear ? undefined : 'numeric' });
  }
  const end = lastDay(period);
  const day = (d: Date, withMonth: boolean) =>
    d.toLocaleDateString(locale, { day: 'numeric', month: withMonth ? 'short' : undefined });
  const range =
    start.getMonth() === end.getMonth()
      ? `${day(start, true)} \u2013 ${end.getDate()}`
      : `${day(start, true)} \u2013 ${day(end, true)}`;
  return sameYear ? range : `${range}, ${start.getFullYear()}`;
}

export function periodKey(period: Period): string {
  return period.kind === 'all' ? 'all' : `${period.kind}:${period.anchor}`;
}

const INVOLVEMENT_RANK: Record<Involvement, number> = {
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

export function toysById(toys: readonly Toy[]): Map<number, Toy> {
  return new Map(toys.map((t) => [t.id, t]));
}

export function toyTooltip(toy: Toy): string {
  return [toy.brand, toy.name, toy.size].filter(Boolean).join(' ');
}

type SessionFlagFilterDef = Readonly<{
  urlParam: string;
  keyToken: string;
  wireParam: 'has_media' | 'has_pr';
  labelKey: MessageKey<'session.filters'>;
}>;

export const SESSION_FLAG_FILTERS = {
  hasMedia: { urlParam: 'media', keyToken: 'm', wireParam: 'has_media', labelKey: 'hasMedia' },
  hasPr: { urlParam: 'pr', keyToken: 'r', wireParam: 'has_pr', labelKey: 'hasPr' },
} as const satisfies Record<string, SessionFlagFilterDef>;

export type SessionFlagKey = keyof typeof SESSION_FLAG_FILTERS;

export type TimeWindow = Readonly<{ from: number; to: number }>;

export const parseTimeWindowParam = (value: string | null): TimeWindow | null => {
  const match = value?.match(/^(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const from = Number(match[1]);
  const to = Number(match[2]);
  const valid = from >= 0 && from <= 23 && to > from && to <= 24;
  return valid ? { from, to } : null;
};

export const SESSION_FLAG_KEYS = Object.keys(SESSION_FLAG_FILTERS) as readonly SessionFlagKey[];

export type SessionFilters = Readonly<
  { toyIds: readonly number[]; timeWindow: TimeWindow | null } & Record<SessionFlagKey, boolean>
>;

const NO_FLAGS = Object.fromEntries(SESSION_FLAG_KEYS.map((key) => [key, false])) as Record<SessionFlagKey, boolean>;

export const NO_SESSION_FILTERS: SessionFilters = { toyIds: [], timeWindow: null, ...NO_FLAGS };

export const activeFlagKeys = (filters: SessionFilters): SessionFlagKey[] =>
  SESSION_FLAG_KEYS.filter((key) => filters[key]);

export const sessionFiltersKey = (filters: SessionFilters): string =>
  [
    filters.toyIds.join(','),
    activeFlagKeys(filters)
      .map((key) => SESSION_FLAG_FILTERS[key].keyToken)
      .join(''),
    filters.timeWindow ? `${filters.timeWindow.from}-${filters.timeWindow.to}` : '',
  ].join('|');

export const activeFilterCount = (filters: SessionFilters): number =>
  filters.toyIds.length + activeFlagKeys(filters).length + (filters.timeWindow ? 1 : 0);

export const toggleToyFilter = (filters: SessionFilters, toyId: number): SessionFilters => ({
  ...filters,
  toyIds: filters.toyIds.includes(toyId) ? filters.toyIds.filter((id) => id !== toyId) : [...filters.toyIds, toyId],
});

export const toggleFlagFilter = (filters: SessionFilters, key: SessionFlagKey): SessionFilters => ({
  ...filters,
  [key]: !filters[key],
});

export const setTimeWindowFilter = (filters: SessionFilters, timeWindow: TimeWindow | null): SessionFilters => ({
  ...filters,
  timeWindow,
});

export const parseSessionFilters = (get: (name: string) => string | null): SessionFilters => ({
  toyIds: parseToyIdsParam(get('toys')),
  timeWindow: parseTimeWindowParam(get('time')),
  ...(Object.fromEntries(
    SESSION_FLAG_KEYS.map((key) => [key, get(SESSION_FLAG_FILTERS[key].urlParam) === '1']),
  ) as Record<SessionFlagKey, boolean>),
});

export const sessionFiltersUrlParams = (filters: SessionFilters): Record<string, string | null> => ({
  toys: filters.toyIds.length > 0 ? filters.toyIds.join(',') : null,
  time: filters.timeWindow ? `${filters.timeWindow.from}-${filters.timeWindow.to}` : null,
  ...Object.fromEntries(
    SESSION_FLAG_KEYS.map((key) => [SESSION_FLAG_FILTERS[key].urlParam, filters[key] ? '1' : null]),
  ),
});

export const sessionFilterWireParams = (
  filters: SessionFilters,
): Partial<
  Record<SessionFlagFilterDef['wireParam'], boolean> & { toys: number[]; time_from: number; time_to: number }
> => ({
  ...(filters.toyIds.length > 0 ? { toys: [...filters.toyIds] } : {}),
  ...Object.fromEntries(activeFlagKeys(filters).map((key) => [SESSION_FLAG_FILTERS[key].wireParam, true])),
  ...(filters.timeWindow ? { time_from: filters.timeWindow.from, time_to: filters.timeWindow.to } : {}),
});

export const parseToyIdsParam = (value: string | null): number[] =>
  value
    ? value
        .split(',')
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    : [];
