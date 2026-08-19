import { ACTIVITY_PALETTE } from './activityPalette';

export const ACTIVITY_WINDOW_DAYS = 365;

const LEGEND_STOPS = 11;

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
export function legendGradient(hue: number, gamma: number = ACTIVITY_PALETTE.gamma): string {
  const stops = Array.from({ length: LEGEND_STOPS }, (_, i) => {
    const t = i / (LEGEND_STOPS - 1);
    return `${hslAt(hue, t, gamma)} ${(t * 100).toFixed(1)}%`;
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
