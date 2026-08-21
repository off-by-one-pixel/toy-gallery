import { describe, expect, it } from 'vitest';

import type { Toy } from '@/api/types';
import { cardSortValue } from '@/features/toys/gallery/cardSortValue';
import type { ToyPropertyContext } from '@/features/toys/properties';

const ctx: ToyPropertyContext = {
  t: (key) => key,
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
    totalLength: 180,
    shape: { sections: [] },
    ...overrides,
  }) as Toy;

describe('cardSortValue', () => {
  it('returns nothing without an active sort', () => {
    expect(cardSortValue(null, toy(), ctx)).toBeNull();
  });

  it('returns nothing for properties already shown on the card', () => {
    for (const column of ['name', 'insertable', 'circumference'] as const) {
      expect(cardSortValue({ column, direction: 'asc' }, toy(), ctx)).toBeNull();
    }
  });

  it('formats total length in the active unit', () => {
    expect(cardSortValue({ column: 'total', direction: 'asc' }, toy(), ctx)).toEqual({
      label: 'common.totalLength',
      value: '180 mm',
    });
    expect(cardSortValue({ column: 'total', direction: 'asc' }, toy({ totalLength: null }), ctx)).toBeNull();
  });

  it('formats popularity as a usage count', () => {
    expect(cardSortValue({ column: 'popularity', direction: 'desc' }, toy(), ctx)).toEqual({
      label: 'sort.column.popularity',
      value: '12',
    });
  });

  it('formats plugged time as a localized duration', () => {
    expect(cardSortValue({ column: 'duration', direction: 'desc' }, toy(), ctx)).toEqual({
      label: 'sort.column.duration',
      value: '1h 35m',
    });
  });
});
