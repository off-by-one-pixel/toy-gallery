import { describe, expect, it } from 'vitest';

import type { Toy } from '@/api/types';
import type { Unit } from '@/features/preferences/units';
import { cardSortValue } from '@/features/toys/gallery/cardSortValue';

const MM: Unit = { id: 'mm', factor: 1, decimals: 0 };

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
    expect(cardSortValue(null, toy(), MM, 'en')).toBeNull();
  });

  it('returns nothing for values already shown on the card', () => {
    for (const column of ['name', 'insertable', 'circumference'] as const) {
      expect(cardSortValue({ column, direction: 'asc' }, toy(), MM, 'en')).toBeNull();
    }
  });

  it('formats total length in the active unit', () => {
    expect(cardSortValue({ column: 'total', direction: 'asc' }, toy(), MM, 'en')).toEqual({
      labelKey: 'common.totalLength',
      value: '180 mm',
    });
    expect(cardSortValue({ column: 'total', direction: 'asc' }, toy({ totalLength: null }), MM, 'en')).toBeNull();
  });

  it('formats popularity as a usage count', () => {
    expect(cardSortValue({ column: 'popularity', direction: 'desc' }, toy(), MM, 'en')).toEqual({
      labelKey: 'sort.column.popularity',
      value: '12',
    });
  });

  it('formats plugged time as a localized duration', () => {
    expect(cardSortValue({ column: 'duration', direction: 'desc' }, toy(), MM, 'en')).toEqual({
      labelKey: 'sort.column.duration',
      value: '1h 35m',
    });
  });
});
