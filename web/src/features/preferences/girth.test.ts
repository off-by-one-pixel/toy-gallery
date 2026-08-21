import { describe, expect, it } from 'vitest';

import { DEFAULT_GIRTH, displayGirth, isGirth } from '@/features/preferences/girth';

describe('girth', () => {
  it('defaults to circumference', () => {
    expect(DEFAULT_GIRTH).toBe('circumference');
  });

  it('accepts only known modes', () => {
    expect(isGirth('circumference')).toBe(true);
    expect(isGirth('diameter')).toBe(true);
    expect(isGirth('radius')).toBe(false);
  });

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
});
