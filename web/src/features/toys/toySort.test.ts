import { describe, expect, it } from 'vitest';

import { sortToys, TOY_SORT } from '@/features/toys/toySort';
import type { Toy } from '@/api/types';
import { makeToy } from '@/test/fixtures';
import { expectSortConfigGuard } from '@/test/sortConfig';

const toy = (id: number, overrides: Partial<Toy> = {}): Toy => makeToy({ id, name: `t${id}`, ...overrides });

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

  it('sorts by the longest single session', () => {
    const toys = [toy(1, { maxDurationMinutes: 30 }), toy(2, { maxDurationMinutes: 65 })];
    expect(sortToys(toys, { column: 'maxDuration', direction: 'desc' }).map((t) => t.id)).toEqual([2, 1]);
    expect(sortToys(toys, { column: 'maxDuration', direction: 'asc' }).map((t) => t.id)).toEqual([1, 2]);
  });

  it('pushes missing measurements to the bottom of a descending sort', () => {
    const toys = [toy(1, { insertableLength: null }), toy(2, { insertableLength: 170 })];
    expect(sortToys(toys, { column: 'insertable', direction: 'desc' }).map((t) => t.id)).toEqual([2, 1]);
  });
});

describe('TOY_SORT config', () => {
  it('exposes the column list and guard consistently', () => {
    expectSortConfigGuard(TOY_SORT, ['started_at']);
  });
});
