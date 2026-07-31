import { describe, expect, it } from 'vitest';

import { buildTimeOfDay } from './timeOfDay';
import type { Session } from './types';

const at = (hour: number): Session =>
  ({ id: hour, startedAt: new Date(2026, 0, 1, hour, 0, 0).toISOString(), entries: [] }) as unknown as Session;

describe('buildTimeOfDay', () => {
  it('produces 24 cells regardless of input', () => {
    expect(buildTimeOfDay([]).cells).toHaveLength(24);
  });

  it('counts sessions into their local hour bucket', () => {
    const tod = buildTimeOfDay([at(21), at(21), at(9)]);
    expect(tod.cells[21].count).toBe(2);
    expect(tod.cells[9].count).toBe(1);
    expect(tod.cells[3].count).toBe(0);
    expect(tod.total).toBe(3);
    expect(tod.max).toBe(2);
  });

  it('leaves empty hours with the empty fill and colours busy hours', () => {
    const tod = buildTimeOfDay([at(21)]);
    expect(tod.cells[0].fill).toBe(tod.cells[3].fill);
    expect(tod.cells[21].fill).not.toBe(tod.cells[0].fill);
  });

  it('has zero total and max for no sessions', () => {
    const tod = buildTimeOfDay([]);
    expect(tod.total).toBe(0);
    expect(tod.max).toBe(0);
  });
});
