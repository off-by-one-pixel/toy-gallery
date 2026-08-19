import { colorFor, legendGradient } from './activity';
import { ACTIVITY_PALETTE } from './activityPalette';

const HOURS = 24;

export type HourCell = Readonly<{ hour: number; count: number; fill: string }>;

export type TimeOfDay = Readonly<{
  cells: HourCell[];
  max: number;
  total: number;
  legendGradient: string;
}>;

export function buildTimeOfDay(hourCounts: readonly number[], hue: number = ACTIVITY_PALETTE.timeOfDayHue): TimeOfDay {
  const counts = Array.from({ length: HOURS }, (_, hour) => hourCounts[hour] ?? 0);
  const max = Math.max(0, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const cells = counts.map((count, hour) => ({
    hour,
    count,
    fill: colorFor(count, 0, max, hue, count > 0, ACTIVITY_PALETTE.sessionsGamma),
  }));
  return { cells, max, total, legendGradient: legendGradient(hue) };
}
