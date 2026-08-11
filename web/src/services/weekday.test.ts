import { describe, expect, it } from 'vitest';

import { ACTIVITY_PALETTE } from './activityPalette';
import { buildWeekday, mondayIndex } from './weekday';
import type { Session } from './types';

const on = (y: number, m: number, d: number): Session =>
  ({ id: d, startedAt: new Date(y, m, d, 12, 0).toISOString(), entries: [] }) as unknown as Session;

describe('mondayIndex', () => {
  it('maps Monday to 0 and Sunday to 6', () => {
    expect(mondayIndex(new Date(2026, 5, 8))).toBe(0);
    expect(mondayIndex(new Date(2026, 5, 14))).toBe(6);
  });
});

describe('buildWeekday', () => {
  it('produces 7 cells regardless of input', () => {
    expect(buildWeekday([]).cells).toHaveLength(7);
  });

  it('counts sessions into Monday-first buckets', () => {
    const wd = buildWeekday([on(2026, 5, 8), on(2026, 5, 15), on(2026, 5, 14)]);
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
    const wd = buildWeekday([on(2026, 5, 8), on(2026, 5, 15), on(2026, 5, 22), on(2026, 5, 29), on(2026, 5, 14)]);
    expect(wd.cells[6].fill).not.toBe(ACTIVITY_PALETTE.empty);
    expect(wd.cells[1].fill).toBe(ACTIVITY_PALETTE.empty);
  });
});
