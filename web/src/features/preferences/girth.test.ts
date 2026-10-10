import { describe, expect, it } from 'vitest';

import { displayGirth, storedGirth } from '@/features/preferences/girth';

describe('girth', () => {
  it('passes circumference through unchanged', () => {
    expect(displayGirth(314.159, 'circumference')).toBeCloseTo(314.159, 3);
  });

  it('converts to diameter via pi', () => {
    expect(displayGirth(314.159, 'diameter')).toBeCloseTo(100, 2);
  });

  it('passes null through for both modes', () => {
    expect(displayGirth(null, 'circumference')).toBeNull();
    expect(displayGirth(undefined, 'diameter')).toBeNull();
  });

  it('stores circumference input unchanged', () => {
    expect(storedGirth(140, 'circumference')).toBe(140);
  });

  it('converts a diameter input to the stored circumference', () => {
    expect(storedGirth(100, 'diameter')).toBeCloseTo(100 * Math.PI, 6);
  });

  it('round-trips a value through display and store', () => {
    expect(storedGirth(displayGirth(140, 'diameter')!, 'diameter')).toBeCloseTo(140, 6);
  });
});
