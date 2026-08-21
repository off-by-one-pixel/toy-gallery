import { describe, expect, it } from 'vitest';

import { colorFor, extent, legendGradient, pluck } from '@/services/activity';
import { ACTIVITY_PALETTE } from '@/services/activityPalette';

describe('extent', () => {
  it('returns the min and max of a non-empty array', () => {
    expect(extent([3, 1, 7, 2])).toEqual({ min: 1, max: 7 });
  });

  it('returns {min: 0, max: 0} for an empty array', () => {
    expect(extent([])).toEqual({ min: 0, max: 0 });
  });

  it('handles a single-value array', () => {
    expect(extent([42])).toEqual({ min: 42, max: 42 });
  });
});

describe('pluck', () => {
  it('extracts non-null values via the picker', () => {
    const items = [{ v: 1 }, { v: null }, { v: 2 }, { v: undefined }];
    expect(pluck(items, (i) => i.v)).toEqual([1, 2]);
  });

  it('returns an empty array when every value is null/undefined', () => {
    expect(pluck([{ v: null }, { v: null }], (i) => i.v)).toEqual([]);
  });
});

describe('colorFor', () => {
  const HUE = ACTIVITY_PALETTE.lengthHue;

  it('returns the empty palette color when there is no session', () => {
    expect(colorFor(120, 0, 200, HUE, false)).toBe(ACTIVITY_PALETTE.empty);
  });

  it('returns the used-only color when there is a session but no value', () => {
    expect(colorFor(null, 0, 200, HUE, true)).toBe(ACTIVITY_PALETTE.usedOnly);
  });

  it('returns an HSL string for a session with a value', () => {
    const out = colorFor(150, 100, 200, HUE, true);
    expect(out.startsWith('hsl(')).toBe(true);
    expect(out).toContain(`${HUE}`);
  });

  it('maps to the deepest color when max equals min (single-value range)', () => {
    const collapsed = colorFor(100, 100, 100, HUE, true);
    const deepest = colorFor(200, 0, 200, HUE, true);
    expect(collapsed).toBe(deepest);
  });
});

describe('legendGradient', () => {
  it('changes the gradient when a custom gamma is supplied', () => {
    expect(legendGradient(220, 1.4)).not.toBe(legendGradient(220));
  });

  it('returns a CSS linear-gradient anchored on the given hue', () => {
    const out = legendGradient(220);
    expect(out.startsWith('linear-gradient(to right,')).toBe(true);
    expect(out).toContain('hsl(220,');
    // 11 stops at 0%, 10%, 20%, … 100%.
    expect(out).toContain('0.0%');
    expect(out).toContain('100.0%');
  });
});
