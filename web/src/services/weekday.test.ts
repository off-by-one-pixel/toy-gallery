import { describe, expect, it } from 'vitest';

import { ACTIVITY_PALETTE } from './activityPalette';
import { buildWeekday } from './weekday';

const counts = (entries: Record<number, number>): number[] => Array.from({ length: 7 }, (_, dow) => entries[dow] ?? 0);

describe('buildWeekday', () => {
  it('produces 7 cells regardless of input', () => {
    expect(buildWeekday([]).cells).toHaveLength(7);
  });

  it('maps counts into Monday-first buckets', () => {
    const wd = buildWeekday(counts({ 0: 2, 6: 1 }));
    expect(wd.cells[0].count).toBe(2);
    expect(wd.cells[6].count).toBe(1);
    expect(wd.cells[3].count).toBe(0);
    expect(wd.total).toBe(3);
    expect(wd.max).toBe(2);
    expect(wd.min).toBe(1);
  });

  it('reports zero min when there are no sessions', () => {
    expect(buildWeekday([]).min).toBe(0);
  });

  it('keeps low-count days visibly distinct from empty days', () => {
    const wd = buildWeekday(counts({ 0: 4, 6: 1 }));
    expect(wd.cells[6].fill).not.toBe(ACTIVITY_PALETTE.empty);
    expect(wd.cells[1].fill).toBe(ACTIVITY_PALETTE.empty);
  });
});
