import { describe, expect, it } from 'vitest';

import { DEFAULT_GIRTH, displayGirth } from '@/features/preferences/girth';

describe('girth', () => {
  it('defaults to circumference', () => {
    expect(DEFAULT_GIRTH).toBe('circumference');
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
