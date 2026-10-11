import { describe, expect, it } from 'vitest';
import { snapToNearest } from './sync';

describe('snapToNearest', () => {
  it('snaps to a candidate within the threshold', () => {
    expect(snapToNearest(98.5, [100], 2)).toBe(100);
  });

  it('keeps the value when no candidate is within the threshold', () => {
    expect(snapToNearest(97, [100], 2)).toBe(97);
    expect(snapToNearest(98, [100], 2)).toBe(98);
  });

  it('skips missing candidates', () => {
    expect(snapToNearest(99, [null, 100], 2)).toBe(100);
    expect(snapToNearest(99, [null], 2)).toBe(99);
  });

  it('picks the nearest candidate regardless of order', () => {
    expect(snapToNearest(119.8, [121, 119.5], 2)).toBe(119.5);
    expect(snapToNearest(119.8, [119.5, 121], 2)).toBe(119.5);
  });
});
