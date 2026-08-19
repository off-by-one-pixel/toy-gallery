import { colorFor, legendGradient } from './activity';
import { ACTIVITY_PALETTE } from './activityPalette';
const DAYS = 7;

export type WeekdayCell = Readonly<{ dow: number; count: number; fill: string }>;

export type Weekday = Readonly<{
  cells: WeekdayCell[];
  min: number;
  max: number;
  total: number;
  legendGradient: string;
}>;

export function buildWeekday(weekdayCounts: readonly number[], hue: number = ACTIVITY_PALETTE.weekdayHue): Weekday {
  const counts = Array.from({ length: DAYS }, (_, dow) => weekdayCounts[dow] ?? 0);
  const present = counts.filter((c) => c > 0);
  const min = present.length > 0 ? Math.min(...present) : 0;
  const max = Math.max(0, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const cells = counts.map((count, dow) => ({
    dow,
    count,
    fill: colorFor(count, min, max, hue, count > 0, ACTIVITY_PALETTE.sessionsGamma),
  }));
  return { cells, min, max, total, legendGradient: legendGradient(hue) };
}
