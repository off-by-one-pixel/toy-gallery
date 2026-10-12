import { ACTIVITY_PALETTE } from '@/features/sessions/stats/activityPalette';

export const ACTIVITY_WINDOW_DAYS = 365;

const LEGEND_STOPS = 11;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lightnessAt = (t: number, gamma: number): number =>
  lerp(ACTIVITY_PALETTE.lightnessMax, ACTIVITY_PALETTE.lightnessMin, Math.pow(t, gamma));

const hslAt = (hue: number, t: number, gamma: number = ACTIVITY_PALETTE.gamma): string =>
  `hsl(${hue}, ${ACTIVITY_PALETTE.saturation}%, ${lightnessAt(t, gamma).toFixed(1)}%)`;

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

export function legendGradient(hue: number, gamma: number = ACTIVITY_PALETTE.gamma): string {
  const stops = Array.from({ length: LEGEND_STOPS }, (_, i) => {
    const t = i / (LEGEND_STOPS - 1);
    return `${hslAt(hue, t, gamma)} ${(t * 100).toFixed(1)}%`;
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

export function extent(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

export type ActivityCell = Readonly<{
  date: string;
  tooltip: string;
  fill: string;
}>;

export type DimensionView = Readonly<{
  title: string;
  summary: string | null;
  cells: ActivityCell[];
  startDate: Date;
  endDate: Date;
  legendGradient: string;
  legendMinLabel: string;
  legendMaxLabel: string;
}>;
