import { describe, expect, it } from 'vitest';

import { sortToys, TOY_SORT } from './toySort';
import { isColumnOf } from '@/lib/sort';
import type { Toy } from '@/api/types';

const toy = (id: number, overrides: Partial<Toy> = {}): Toy =>
  ({
    id,
    brand: 'B',
    name: `t${id}`,
    size: '',
    usageCount: 0,
    totalDurationMinutes: 0,
    shape: { sections: [] },
    ...overrides,
  }) as Toy;

describe('sortToys', () => {
  it('returns input untouched without a sort', () => {
    const toys = [toy(2), toy(1)];
    expect(sortToys(toys, null)).toBe(toys);
  });

  it('sorts by name ascending and descending', () => {
    const toys = [toy(1, { name: 'zeta' }), toy(2, { name: 'alpha' })];
    expect(sortToys(toys, { column: 'name', direction: 'asc' }).map((t) => t.id)).toEqual([2, 1]);
    expect(sortToys(toys, { column: 'name', direction: 'desc' }).map((t) => t.id)).toEqual([1, 2]);
  });

  it('pushes missing measurements to the bottom of a descending sort', () => {
    const toys = [toy(1, { insertableLength: null }), toy(2, { insertableLength: 170 })];
    expect(sortToys(toys, { column: 'insertable', direction: 'desc' }).map((t) => t.id)).toEqual([2, 1]);
  });
});

describe('TOY_SORT config', () => {
  it('exposes the column list and guard consistently', () => {
    for (const column of TOY_SORT.columns) expect(isColumnOf(TOY_SORT, column)).toBe(true);
    expect(isColumnOf(TOY_SORT, 'started_at')).toBe(false);
  });
});
