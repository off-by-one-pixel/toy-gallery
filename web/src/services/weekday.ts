import { colorFor, legendGradient } from './activity';
import { ACTIVITY_PALETTE } from './activityPalette';
import type { Session } from './types';

const DAYS = 7;

export type WeekdayCell = Readonly<{ dow: number; count: number; fill: string }>;

export type Weekday = Readonly<{
  cells: WeekdayCell[];
  min: number;
  max: number;
  total: number;
  legendGradient: string;
}>;

export const mondayIndex = (date: Date): number => (date.getDay() + 6) % 7;

export function buildWeekday(sessions: readonly Session[], hue: number = ACTIVITY_PALETTE.weekdayHue): Weekday {
  const counts = Array.from({ length: DAYS }, () => 0);
  for (const s of sessions) {
    counts[mondayIndex(new Date(s.startedAt))] += 1;
  }
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
