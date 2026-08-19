import type { ActivityDay, StatsGroup } from './types';

export const METRIC_COUNT = 'count';
export const METRIC_MAX_LENGTH = 'max:insertable_length';
export const METRIC_MAX_CIRCUMFERENCE = 'max:circumference';

export const countsFromGroups = (groups: readonly StatsGroup[], size: number): number[] => {
  const counts = Array.from({ length: size }, () => 0);
  for (const group of groups) {
    const index = Number(group.key);
    if (Number.isInteger(index) && index >= 0 && index < size) {
      counts[index] = group.values[METRIC_COUNT] ?? 0;
    }
  }
  return counts;
};

export const activityDaysFromStats = (groups: readonly StatsGroup[]): ActivityDay[] =>
  groups.map((group) => ({
    date: group.key,
    sessionCount: group.values[METRIC_COUNT] ?? 0,
    maxInsertableLength: group.values[METRIC_MAX_LENGTH] ?? null,
    maxCircumference: group.values[METRIC_MAX_CIRCUMFERENCE] ?? null,
  }));

export const localDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const daysAgoDateString = (days: number, now: Date = new Date()): string => {
  const shifted = new Date(now);
  shifted.setDate(shifted.getDate() - days);
  return localDateString(shifted);
};
