import {
  ACTIVITY_WINDOW_DAYS,
  type ActivityCell,
  colorFor,
  type DimensionView,
  extent,
  legendGradient,
} from '@/features/sessions/stats/activity';
import { ACTIVITY_PALETTE } from '@/features/sessions/stats/activityPalette';
import {
  daysAgoDateString,
  formatDateKey,
  localDateKey,
  MS_PER_DAY,
  parseDateKey,
  startOfDay,
  startOfWeek,
} from '@/lib/dates';
import type { Girth } from '@/features/preferences/girth';
import { type Period, periodRange } from '@/features/sessions/session';
import type { StatsGroup } from '@/api/types';
import { formatValue, type Unit } from '@/features/preferences/units';
import type { Translator } from '@/i18n/translator';

export type StatContext = Readonly<{
  unit: Unit;
  girth: Girth;
  locale: string;
  t: Translator;
}>;

export type StatWindow = 'year' | 'filter';
type StatGroupBy = 'date' | 'hour' | 'weekday';

export type CalendarStatDef = Readonly<{
  kind: 'calendar';
  key: string;
  metric: string;
  hue: number;
  gamma?: number;
  title: (ctx: StatContext) => string;
  value?: (raw: number | null, ctx: StatContext) => number | null;
  formatLegend?: (value: number, ctx: StatContext) => string;
  summary?: (total: number, ctx: StatContext) => string;
}>;

export type FrequencyStatDef = Readonly<{
  kind: 'hour' | 'weekday';
  key: string;
  metric: string;
  hue: number;
  gamma?: number;
  minPolicy: 'zero' | 'nonzeroMin';
  title: (ctx: StatContext) => string;
  bucketLabel: (index: number, ctx: StatContext) => string | number;
  tooltip: (index: number, count: number, ctx: StatContext) => string;
  empty: (ctx: StatContext) => string;
}>;

export type WeeklyStatDef = Readonly<{
  kind: 'weekly';
  key: string;
  metric: string;
  hue: number;
  title: (ctx: StatContext) => string;
  empty: (ctx: StatContext) => string;
  format: (value: number, ctx: StatContext) => string;
  tooltip: (week: string, value: string, ctx: StatContext) => string;
}>;

export type StatDef = CalendarStatDef | FrequencyStatDef | WeeklyStatDef;

export type StatQuery = Readonly<{
  groupBy: StatGroupBy;
  window: StatWindow;
  metrics: string[];
}>;

const BUCKET_COUNT = { hour: 24, weekday: 7 } as const;

const groupByOf = (kind: StatDef['kind']): StatGroupBy => (kind === 'calendar' || kind === 'weekly' ? 'date' : kind);

export const deriveQueries = (defs: readonly StatDef[]): StatQuery[] => {
  const queries = new Map<StatGroupBy, StatQuery>();
  for (const { kind, metric } of defs) {
    const groupBy = groupByOf(kind);
    const existing = queries.get(groupBy);
    if (existing) {
      if (!existing.metrics.includes(metric)) existing.metrics.push(metric);
    } else {
      queries.set(groupBy, { groupBy, window: groupBy === 'date' ? 'year' : 'filter', metrics: [metric] });
    }
  }
  return [...queries.values()];
};

export const rangeFor = (window: StatWindow, period: Period): Readonly<{ start?: string; end?: string }> => {
  if (period.kind !== 'all') return periodRange(period);
  return window === 'year' ? { start: daysAgoDateString(ACTIVITY_WINDOW_DAYS - 1) } : {};
};

export type FrequencyView = Readonly<{
  title: string;
  emptyLabel: string;
  total: number;
  legendMin: number;
  max: number;
  legendGradient: string;
  cells: readonly { key: number; label: string | number; fill: string; tooltip: string }[];
}>;

export type WeeklyView = Readonly<{
  title: string;
  summary: string | null;
  emptyLabel: string;
  total: number;
  fill: string;
  maxLabel: string;
  startLabel: string;
  endLabel: string;
  bars: readonly { week: string; height: number; tooltip: string }[];
}>;

export type StatViewItem =
  | Readonly<{ kind: 'calendar'; key: string; view: DimensionView }>
  | Readonly<{ kind: 'frequency'; key: string; view: FrequencyView }>
  | Readonly<{ kind: 'weekly'; key: string; view: WeeklyView }>;

const calendarValues = (
  def: CalendarStatDef,
  groups: readonly StatsGroup[],
  ctx: StatContext,
): Map<string, number | null> => {
  const byDate = new Map<string, number | null>();
  for (const group of groups) {
    const raw = group.values[def.metric] ?? null;
    byDate.set(group.key, def.value ? def.value(raw, ctx) : raw);
  }
  return byDate;
};

export function buildCalendarView(
  def: CalendarStatDef,
  groups: readonly StatsGroup[],
  ctx: StatContext,
  options?: Readonly<{ today?: Date; windowDays?: number }>,
): DimensionView {
  const windowDays = options?.windowDays ?? ACTIVITY_WINDOW_DAYS;
  const today = startOfDay(options?.today ?? new Date());
  const startDate = new Date(today.getTime() - (windowDays - 1) * MS_PER_DAY);
  const byDate = calendarValues(def, groups, ctx);

  const range = extent([...byDate.values()].filter((v): v is number => v != null));
  const cells: ActivityCell[] = [];
  for (let i = 0; i < windowDays; i++) {
    const key = localDateKey(new Date(startDate.getTime() + i * MS_PER_DAY));
    const fill = colorFor(byDate.get(key), range.min, range.max, def.hue, byDate.has(key), def.gamma);
    cells.push({ date: key, tooltip: formatDateKey(key, ctx.locale), fill });
  }

  const hasData = range.max > 0;
  const formatLegend = def.formatLegend ?? ((value: number) => `${formatValue(value, ctx.unit)} ${ctx.unit.id}`);
  const total = [...byDate.values()].reduce((sum: number, v) => sum + (v ?? 0), 0);
  return {
    title: def.title(ctx),
    summary: def.summary && hasData ? def.summary(total, ctx) : null,
    cells,
    startDate,
    endDate: today,
    legendGradient: legendGradient(def.hue, def.gamma),
    legendMinLabel: hasData ? formatLegend(range.min, ctx) : '—',
    legendMaxLabel: hasData ? formatLegend(range.max, ctx) : '—',
  };
}

const bucketValues = (def: FrequencyStatDef, groups: readonly StatsGroup[]): number[] => {
  const size = BUCKET_COUNT[def.kind];
  const counts = Array.from({ length: size }, () => 0);
  for (const group of groups) {
    const index = Number(group.key);
    if (Number.isInteger(index) && index >= 0 && index < size) {
      counts[index] = group.values[def.metric] ?? 0;
    }
  }
  return counts;
};

const legendMinOf = (def: FrequencyStatDef, counts: readonly number[]): number => {
  if (def.minPolicy === 'zero') return 0;
  const present = counts.filter((count) => count > 0);
  return present.length > 0 ? Math.min(...present) : 0;
};

export function buildFrequencyView(
  def: FrequencyStatDef,
  groups: readonly StatsGroup[],
  ctx: StatContext,
): FrequencyView {
  const counts = bucketValues(def, groups);
  const legendMin = legendMinOf(def, counts);
  const max = Math.max(0, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  return {
    title: def.title(ctx),
    emptyLabel: def.empty(ctx),
    total,
    legendMin,
    max,
    legendGradient: legendGradient(def.hue, def.gamma),
    cells: counts.map((count, index) => ({
      key: index,
      label: def.bucketLabel(index, ctx),
      fill: colorFor(count, legendMin, max, def.hue, count > 0, def.gamma),
      tooltip: def.tooltip(index, count, ctx),
    })),
  };
}

const weekStarts = (first: Date, last: Date): Date[] => {
  const weeks: Date[] = [];
  let week = first;
  while (week.getTime() <= last.getTime()) {
    weeks.push(week);
    week = new Date(week.getFullYear(), week.getMonth(), week.getDate() + 7);
  }
  return weeks;
};

const weeklyTotals = (def: WeeklyStatDef, groups: readonly StatsGroup[]): Map<string, number> => {
  const totals = new Map<string, number>();
  for (const group of groups) {
    const week = localDateKey(startOfWeek(parseDateKey(group.key)));
    totals.set(week, (totals.get(week) ?? 0) + (group.values[def.metric] ?? 0));
  }
  return totals;
};

export function buildWeeklyView(
  def: WeeklyStatDef,
  groups: readonly StatsGroup[],
  ctx: StatContext,
  options?: Readonly<{ today?: Date; windowDays?: number }>,
): WeeklyView {
  const windowDays = options?.windowDays ?? ACTIVITY_WINDOW_DAYS;
  const today = startOfDay(options?.today ?? new Date());
  const firstWeek = startOfWeek(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (windowDays - 1)));
  const lastWeek = startOfWeek(today);
  const totals = weeklyTotals(def, groups);
  const weeks = weekStarts(firstWeek, lastWeek).map((week) => {
    const key = localDateKey(week);
    return { key, value: totals.get(key) ?? 0 };
  });

  const max = Math.max(0, ...weeks.map((week) => week.value));
  const total = weeks.reduce((sum, week) => sum + week.value, 0);
  return {
    title: def.title(ctx),
    summary: total > 0 ? def.format(total, ctx) : null,
    emptyLabel: def.empty(ctx),
    total,
    fill: `hsl(${def.hue}, ${ACTIVITY_PALETTE.saturation}%, ${ACTIVITY_PALETTE.barLightness}%)`,
    maxLabel: def.format(max, ctx),
    startLabel: formatDateKey(localDateKey(firstWeek), ctx.locale),
    endLabel: formatDateKey(localDateKey(lastWeek), ctx.locale),
    bars: weeks.map(({ key, value }) => ({
      week: key,
      height: max > 0 ? (value / max) * 100 : 0,
      tooltip: def.tooltip(formatDateKey(key, ctx.locale), def.format(value, ctx), ctx),
    })),
  };
}

export function buildStatViews(
  defs: readonly StatDef[],
  results: ReadonlyMap<string, StatsGroup[]>,
  ctx: StatContext,
): StatViewItem[] {
  return defs.map((def) => {
    const groups = results.get(groupByOf(def.kind)) ?? [];
    if (def.kind === 'calendar') {
      return { kind: 'calendar', key: def.key, view: buildCalendarView(def, groups, ctx) };
    }
    if (def.kind === 'weekly') {
      return { kind: 'weekly', key: def.key, view: buildWeeklyView(def, groups, ctx) };
    }
    return { kind: 'frequency', key: def.key, view: buildFrequencyView(def, groups, ctx) };
  });
}
