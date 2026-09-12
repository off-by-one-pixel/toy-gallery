import { describe, expect, it } from 'vitest';

import {
  attrColumn,
  attributeSortColumns,
  galleryToySortConfig,
  SESSION_FORM_TOY_SORT,
  sortToys,
  TOY_SORT,
} from '@/features/toys/toySort';
import type { Toy } from '@/api/types';
import { makeToy } from '@/test/fixtures';
import { expectSortConfigGuard } from '@/test/sortConfig';
import { isColumnOf } from '@/lib/sort';

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

describe('sortToys by attribute', () => {
  const attrToy = (id: number, attrs?: Record<string, string>) => toy(id, { customAttributes: attrs });

  it('sorts string values case-insensitively', () => {
    const toys = [attrToy(1, { material: 'Steel' }), attrToy(2, { material: 'glass' })];
    expect(sortToys(toys, { column: attrColumn('material'), direction: 'asc' }).map((t) => t.id)).toEqual([2, 1]);
    expect(sortToys(toys, { column: attrColumn('material'), direction: 'desc' }).map((t) => t.id)).toEqual([1, 2]);
  });

  it('compares numerically when every present value is a number', () => {
    const toys = [attrToy(1, { weight: '9' }), attrToy(2, { weight: '12' }), attrToy(3, { weight: '100' })];
    expect(sortToys(toys, { column: attrColumn('weight'), direction: 'asc' }).map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it('falls back to string comparison when any value is non-numeric', () => {
    const toys = [attrToy(1, { weight: '9' }), attrToy(2, { weight: '12' }), attrToy(3, { weight: 'heavy' })];
    expect(sortToys(toys, { column: attrColumn('weight'), direction: 'asc' }).map((t) => t.id)).toEqual([2, 1, 3]);
  });

  it('sinks toys without the attribute to the bottom in both directions', () => {
    const toys = [attrToy(1), attrToy(2, { material: 'wood' }), attrToy(3, { material: 'glass' })];
    expect(sortToys(toys, { column: attrColumn('material'), direction: 'asc' }).map((t) => t.id)).toEqual([3, 2, 1]);
    expect(sortToys(toys, { column: attrColumn('material'), direction: 'desc' }).map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it('keeps the input order for an attribute no toy carries', () => {
    const toys = [attrToy(2), attrToy(1)];
    expect(sortToys(toys, { column: attrColumn('gone'), direction: 'asc' }).map((t) => t.id)).toEqual([2, 1]);
  });
});

describe('attributeSortColumns', () => {
  it('orders keys by how many toys carry them, then alphabetically', () => {
    const toys = [
      toy(1, { customAttributes: { rare: 'x', common: 'a' } }),
      toy(2, { customAttributes: { common: 'b', beta: '1' } }),
      toy(3, { customAttributes: { common: 'c', alpha: '2' } }),
    ];
    expect(attributeSortColumns(toys)).toEqual(['attr:common', 'attr:alpha', 'attr:beta', 'attr:rare']);
  });

  it('returns nothing for toys without attributes', () => {
    expect(attributeSortColumns([toy(1)])).toEqual([]);
  });
});

describe('TOY_SORT config', () => {
  it('exposes the column list and guard consistently', () => {
    expectSortConfigGuard(TOY_SORT, ['started_at']);
  });

  it('accepts attribute columns in the gallery but not in the session form', () => {
    expect(isColumnOf(TOY_SORT, 'attr:material')).toBe(true);
    expect(isColumnOf(SESSION_FORM_TOY_SORT, 'attr:material')).toBe(false);
  });

  it('appends discovered attribute columns to the gallery config', () => {
    const config = galleryToySortConfig([toy(1, { customAttributes: { material: 'wood' } })]);
    expect(config.columns).toEqual([...TOY_SORT.columns, 'attr:material']);
  });
});
