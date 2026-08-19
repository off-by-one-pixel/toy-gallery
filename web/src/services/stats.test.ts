import { describe, expect, it } from 'vitest';

import { filterStartDate } from './session';
import {
  activityDaysFromStats,
  countsFromGroups,
  daysAgoDateString,
  METRIC_COUNT,
  METRIC_MAX_CIRCUMFERENCE,
  METRIC_MAX_LENGTH,
} from './stats';

describe('countsFromGroups', () => {
  it('fills gaps with zero and places counts by key', () => {
    const counts = countsFromGroups(
      [
        { key: '2', values: { [METRIC_COUNT]: 3 } },
        { key: '10', values: { [METRIC_COUNT]: 1 } },
      ],
      24,
    );
    expect(counts).toHaveLength(24);
    expect(counts[2]).toBe(3);
    expect(counts[10]).toBe(1);
    expect(counts[0]).toBe(0);
  });

  it('ignores out-of-range and non-numeric keys', () => {
    const counts = countsFromGroups(
      [
        { key: '7', values: { [METRIC_COUNT]: 2 } },
        { key: '2026-06-01', values: { [METRIC_COUNT]: 9 } },
        { key: '-1', values: { [METRIC_COUNT]: 9 } },
      ],
      7,
    );
    expect(counts.reduce((a, b) => a + b, 0)).toBe(0);
  });
});

describe('activityDaysFromStats', () => {
  it('adapts stats groups to activity days', () => {
    const days = activityDaysFromStats([
      {
        key: '2026-06-01',
        values: { [METRIC_COUNT]: 2, [METRIC_MAX_LENGTH]: 170, [METRIC_MAX_CIRCUMFERENCE]: null },
      },
    ]);
    expect(days).toEqual([{ date: '2026-06-01', sessionCount: 2, maxInsertableLength: 170, maxCircumference: null }]);
  });
});

describe('date range helpers', () => {
  it('daysAgoDateString formats local calendar days', () => {
    expect(daysAgoDateString(1, new Date(2026, 5, 8, 12, 0))).toBe('2026-06-07');
    expect(daysAgoDateString(0, new Date(2026, 0, 2, 0, 30))).toBe('2026-01-02');
  });

  it('filterStartDate maps filters to window starts', () => {
    const now = new Date(2026, 5, 15, 12, 0);
    expect(filterStartDate('week', now)).toBe('2026-06-08');
    expect(filterStartDate('month', now)).toBe('2026-05-16');
    expect(filterStartDate('all', now)).toBeUndefined();
  });
});
