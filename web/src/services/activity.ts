import { ACTIVITY_PALETTE } from './activityPalette';
import { DEFAULT_GIRTH, displayGirth, type Girth } from './girth';
import type { ActivityDay } from './types';
import { formatValue, type Unit } from './units';

export const ACTIVITY_WINDOW_DAYS = 365;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LEGEND_STOPS = 11;

/** YYYY-MM-DD key in the system's local timezone. The heatmap groups
 *  sessions by local calendar day, so we never reach for UTC here. */
export function localDateKey(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Human-readable date for the cell hover tooltip. */
export function formatTooltipDate(key: string, locale: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lightnessAt = (t: number, gamma: number): number =>
  lerp(ACTIVITY_PALETTE.lightnessMax, ACTIVITY_PALETTE.lightnessMin, Math.pow(t, gamma));

const hslAt = (hue: number, t: number, gamma: number = ACTIVITY_PALETTE.gamma): string =>
  `hsl(${hue}, ${ACTIVITY_PALETTE.saturation}%, ${lightnessAt(t, gamma).toFixed(1)}%)`;

/** Cell fill for a (day-data, dimension-range) combination. */
export function colorFor(
  value: number | null | undefined,
  min: number,
  max: number,
  hue: number,
  hasSession: boolean,
  gamma: number = ACTIVITY_PALETTE.gamma,
): string {
  if (!hasSession) return ACTIVITY_PALETTE.empty;
  if (value == null) return ACTIVITY_PALETTE.usedOnly;
  const intensity = max > min ? (value - min) / (max - min) : 1;
  return hslAt(hue, intensity, gamma);
}

/** CSS linear-gradient that interpolates the per-hue palette from
 *  palest to deepest, used under the legend bar. */
export function legendGradient(hue: number): string {
  const stops = Array.from({ length: LEGEND_STOPS }, (_, i) => {
    const t = i / (LEGEND_STOPS - 1);
    return `${hslAt(hue, t)} ${(t * 100).toFixed(1)}%`;
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

/** Min / max of a numeric array; `{ min: 0, max: 0 }` for an empty input. */
export function extent(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** Map + filter-nulls helper. */
export function pluck<T>(items: readonly T[], pick: (item: T) => number | null | undefined): number[] {
  return items.map(pick).filter((v): v is number => v != null);
}

/** Single rendered cell — what the component hands to react-calendar-heatmap. */
export type ActivityCell = Readonly<{
  date: string;
  tooltip: string;
  fill: string;
}>;

/** Everything a DimensionHeatmap needs to render — fully precomputed,
 *  unit labels included. */
export type DimensionView = Readonly<{
  title: string;
  cells: ActivityCell[];
  startDate: Date;
  endDate: Date;
  legendGradient: string;
  legendMinLabel: string;
  legendMaxLabel: string;
}>;

export type ActivityHeatmap = Readonly<{
  length: DimensionView;
  circumference: DimensionView;
  sessions: DimensionView;
}>;

type DimensionInput = Readonly<{
  title: string;
  pick: (d: ActivityDay) => number | null | undefined;
  hue: number;
  gamma?: number;
  formatLegend?: (value: number) => string;
}>;

const buildDimensionView = (
  input: DimensionInput,
  byDate: ReadonlyMap<string, ActivityDay>,
  startDate: Date,
  endDate: Date,
  windowDays: number,
  unit: Unit,
  locale: string,
): DimensionView => {
  const range = extent(pluck(Array.from(byDate.values()), input.pick));
  const cells: ActivityCell[] = [];
  for (let i = 0; i < windowDays; i++) {
    const date = new Date(startDate.getTime() + i * MS_PER_DAY);
    const key = localDateKey(date);
    const day = byDate.get(key);
    const fill = colorFor(day ? input.pick(day) : null, range.min, range.max, input.hue, day != null, input.gamma);
    cells.push({ date: key, tooltip: formatTooltipDate(key, locale), fill });
  }
  const hasData = range.max > 0;
  const formatLegend = input.formatLegend ?? ((value: number) => `${formatValue(value, unit)} ${unit.id}`);
  return {
    title: input.title,
    cells,
    startDate,
    endDate,
    legendGradient: legendGradient(input.hue),
    legendMinLabel: hasData ? formatLegend(range.min) : '—',
    legendMaxLabel: hasData ? formatLegend(range.max) : '—',
  };
};

export type ActivityLabels = Readonly<{
  length: string;
  circumference: string;
  sessions: string;
}>;

/** Build the complete heatmap data for the activity tracker, in the
 *  user's current unit. The dimension cells / colors are unit-agnostic;
 *  only the legend labels change with the unit. */
export function buildActivityHeatmap(
  days: readonly ActivityDay[],
  unit: Unit,
  locale: string,
  labels: ActivityLabels,
  options?: Readonly<{ today?: Date; windowDays?: number; girth?: Girth }>,
): ActivityHeatmap {
  const windowDays = options?.windowDays ?? ACTIVITY_WINDOW_DAYS;
  const today = options?.today ? new Date(options.today) : new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today.getTime() - (windowDays - 1) * MS_PER_DAY);
  const byDate = new Map(days.map((d) => [d.date, d]));
  return {
    length: buildDimensionView(
      { title: labels.length, pick: (d) => d.maxInsertableLength, hue: ACTIVITY_PALETTE.lengthHue },
      byDate,
      startDate,
      today,
      windowDays,
      unit,
      locale,
    ),
    circumference: buildDimensionView(
      {
        title: labels.circumference,
        pick: (d) => displayGirth(d.maxCircumference, options?.girth ?? DEFAULT_GIRTH),
        hue: ACTIVITY_PALETTE.circumferenceHue,
      },
      byDate,
      startDate,
      today,
      windowDays,
      unit,
      locale,
    ),
    sessions: buildDimensionView(
      {
        title: labels.sessions,
        pick: (d) => d.sessionCount,
        hue: ACTIVITY_PALETTE.sessionsHue,
        gamma: ACTIVITY_PALETTE.sessionsGamma,
        formatLegend: (value) => `${Math.round(value)}`,
      },
      byDate,
      startDate,
      today,
      windowDays,
      unit,
      locale,
    ),
  };
}
