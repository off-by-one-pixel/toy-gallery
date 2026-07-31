import { colorFor, legendGradient } from './activity';
import { ACTIVITY_PALETTE } from './activityPalette';
import type { Session } from './types';

const HOURS = 24;

export type HourCell = Readonly<{ hour: number; count: number; fill: string }>;

export type TimeOfDay = Readonly<{
  cells: HourCell[];
  max: number;
  total: number;
  legendGradient: string;
}>;

export function buildTimeOfDay(sessions: readonly Session[], hue: number = ACTIVITY_PALETTE.timeOfDayHue): TimeOfDay {
  const counts = Array.from({ length: HOURS }, () => 0);
  for (const s of sessions) {
    const h = new Date(s.startedAt).getHours();
    if (h >= 0 && h < HOURS) counts[h] += 1;
  }
  const max = Math.max(0, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const cells = counts.map((count, hour) => ({ hour, count, fill: colorFor(count, 0, max, hue, count > 0) }));
  return { cells, max, total, legendGradient: legendGradient(hue) };
}
