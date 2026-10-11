import { describe, expect, it } from 'vitest';

import type { Toy } from '@/api/types';
import { sortColumnDisplay } from '@/features/toys/gallery/sortColumnDisplay';
import type { ToyPropertyContext } from '@/features/toys/properties';
import en from '@/i18n/catalogs/en.json';
import { enTranslator } from '@/test/translator';

const ctx: ToyPropertyContext = {
  t: enTranslator,
  girth: 'circumference',
  unit: { id: 'mm', factor: 1, decimals: 0 },
  locale: 'en',
};

const toy = (overrides: Partial<Toy> = {}): Toy =>
  ({
    id: 1,
    brand: 'B',
    name: 'n',
    size: '',
    usageCount: 12,
    totalDurationMinutes: 95,
    maxDurationMinutes: 65,
    totalLength: 180,
    shape: { sections: [] },
    ...overrides,
  }) as Toy;

describe('sortColumnDisplay', () => {
  it('labels an attribute column with the raw key and reads its value', () => {
    const display = sortColumnDisplay('attr:material', ctx);
    expect(display?.label).toBe('material');
    expect(display?.valueFor(toy({ customAttributes: { material: 'wood' } }))).toBe('wood');
    expect(display?.valueFor(toy())).toBeNull();
  });

  it('returns nothing for properties already shown on the card', () => {
    for (const column of ['name', 'insertable', 'circumference'] as const) {
      expect(sortColumnDisplay(column, ctx)).toBeNull();
    }
  });

  it('formats total length in the active unit', () => {
    const display = sortColumnDisplay('total', ctx);
    expect(display?.label).toBe(en.common.totalLength);
    expect(display?.valueFor(toy())).toBe('180 mm');
    expect(display?.valueFor(toy({ totalLength: null }))).toBeNull();
  });

  it('formats popularity as a usage count', () => {
    const display = sortColumnDisplay('popularity', ctx);
    expect(display?.label).toBe(en.sort.column.popularity);
    expect(display?.valueFor(toy())).toBe('12');
  });

  it('formats plugged time as a localized duration', () => {
    const display = sortColumnDisplay('duration', ctx);
    expect(display?.label).toBe(en.sort.column.duration);
    expect(display?.valueFor(toy())).toBe('1h 35m');
  });

  it('formats the longest single session as a localized duration', () => {
    const display = sortColumnDisplay('maxDuration', ctx);
    expect(display?.label).toBe(en.sort.column.maxDuration);
    expect(display?.valueFor(toy())).toBe('1h 5m');
  });
});
