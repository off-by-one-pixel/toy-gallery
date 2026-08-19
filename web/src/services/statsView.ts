import {
  ACTIVITY_WINDOW_DAYS,
  type ActivityCell,
  colorFor,
  type DimensionView,
  extent,
  legendGradient,
} from './activity';
import { daysAgoDateString, formatDateKey, localDateKey, MS_PER_DAY, startOfDay } from './dates';
import type { Girth } from './girth';
import { type FilterKey, filterStartDate } from './session';
import type { StatsGroup } from './types';
import { formatValue, type Unit } from './units';

export type StatContext = Readonly<{
  unit: Unit;
  girth: Girth;
  locale: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}>;

export type StatWindow = 'year' | 'filter';
export type StatGroupBy = 'date' | 'hour' | 'weekday';

export type CalendarStatDef = Readonly<{
  kind: 'calendar';
  key: string;
  groupBy: 'date';
  window: StatWindow;
  metric: string;
  hue: number;
  gamma?: number;
  title: (ctx: StatContext) => string;
  value?: (raw: number | null, ctx: StatContext) => number | null;
  formatLegend?: (value: number, ctx: StatContext) => string;
}>;

export type FrequencyStatDef = Readonly<{
  kind: 'frequency';
  key: string;
  groupBy: 'hour' | 'weekday';
  window: StatWindow;
  metric: string;
  size: number;
  hue: number;
  gamma?: number;
  minPolicy: 'zero' | 'nonzeroMin';
  title: (ctx: StatContext) => string;
  bucketLabel: (index: number, ctx: StatContext) => string | number;
  tooltip: (index: number, count: number, ctx: StatContext) => string;
  empty: (ctx: StatContext) => string;
}>;

export type StatDef = CalendarStatDef | FrequencyStatDef;

export type StatQuery = Readonly<{
  key: string;
  groupBy: StatGroupBy;
  window: StatWindow;
  metrics: string[];
}>;

export const queryKeyOf = (def: StatDef): string => `${def.groupBy}:${def.window}`;

export const deriveQueries = (defs: readonly StatDef[]): StatQuery[] => {
  const queries = new Map<string, StatQuery>();
  for (const def of defs) {
    const key = queryKeyOf(def);
    const existing = queries.get(key);
    if (existing) {
      if (!existing.metrics.includes(def.metric)) existing.metrics.push(def.metric);
    } else {
      queries.set(key, { key, groupBy: def.groupBy, window: def.window, metrics: [def.metric] });
    }
  }
  return [...queries.values()];
};

export const startFor = (window: StatWindow, filter: FilterKey): string | undefined =>
  window === 'year' ? daysAgoDateString(ACTIVITY_WINDOW_DAYS - 1) : filterStartDate(filter);

export type FrequencyView = Readonly<{
  title: string;
  emptyLabel: string;
  total: number;
  legendMin: number;
  max: number;
  legendGradient: string;
  cells: readonly { key: number; label: string | number; fill: string; tooltip: string }[];
}>;

export type StatViewItem =
  | Readonly<{ kind: 'calendar'; key: string; view: DimensionView }>
  | Readonly<{ kind: 'frequency'; key: string; view: FrequencyView }>;

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
  return {
    title: def.title(ctx),
    cells,
    startDate,
    endDate: today,
    legendGradient: legendGradient(def.hue, def.gamma),
    legendMinLabel: hasData ? formatLegend(range.min, ctx) : '—',
    legendMaxLabel: hasData ? formatLegend(range.max, ctx) : '—',
  };
}

const bucketValues = (def: FrequencyStatDef, groups: readonly StatsGroup[]): number[] => {
  const counts = Array.from({ length: def.size }, () => 0);
  for (const group of groups) {
    const index = Number(group.key);
    if (Number.isInteger(index) && index >= 0 && index < def.size) {
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

export function buildStatViews(
  defs: readonly StatDef[],
  results: ReadonlyMap<string, StatsGroup[]>,
  ctx: StatContext,
): StatViewItem[] {
  return defs.map((def) => {
    const groups = results.get(queryKeyOf(def)) ?? [];
    if (def.kind === 'calendar') {
      return { kind: 'calendar', key: def.key, view: buildCalendarView(def, groups, ctx) };
    }
    return { kind: 'frequency', key: def.key, view: buildFrequencyView(def, groups, ctx) };
  });
}
