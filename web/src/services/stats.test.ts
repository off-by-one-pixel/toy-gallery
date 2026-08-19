import { describe, expect, it } from 'vitest';

import { filterStartDate } from './session';
import { daysAgoDateString } from './stats';

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
