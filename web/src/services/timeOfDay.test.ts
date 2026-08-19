import { describe, expect, it } from 'vitest';

import { buildTimeOfDay } from './timeOfDay';

const counts = (entries: Record<number, number>): number[] =>
  Array.from({ length: 24 }, (_, hour) => entries[hour] ?? 0);

describe('buildTimeOfDay', () => {
  it('produces 24 cells regardless of input', () => {
    expect(buildTimeOfDay([]).cells).toHaveLength(24);
  });

  it('maps counts into hour buckets', () => {
    const tod = buildTimeOfDay(counts({ 21: 2, 9: 1 }));
    expect(tod.cells[21].count).toBe(2);
    expect(tod.cells[9].count).toBe(1);
    expect(tod.cells[3].count).toBe(0);
    expect(tod.total).toBe(3);
    expect(tod.max).toBe(2);
  });

  it('leaves empty hours with the empty fill and colours busy hours', () => {
    const tod = buildTimeOfDay(counts({ 21: 1 }));
    expect(tod.cells[0].fill).toBe(tod.cells[3].fill);
    expect(tod.cells[21].fill).not.toBe(tod.cells[0].fill);
  });

  it('has zero total and max for no counts', () => {
    const tod = buildTimeOfDay([]);
    expect(tod.total).toBe(0);
    expect(tod.max).toBe(0);
  });
});
