import { describe, expect, it } from 'vitest';

import { cycleSort, isValidSort, narrowSort } from '@/lib/sort';

describe('cycleSort', () => {
  it('flips direction when the same column repeats', () => {
    expect(cycleSort({ column: 'name', direction: 'asc' }, 'name')).toEqual({
      column: 'name',
      direction: 'desc',
    });
  });

  it('keeps the current direction when switching columns', () => {
    expect(cycleSort({ column: 'name', direction: 'desc' }, 'size')).toEqual({
      column: 'size',
      direction: 'desc',
    });
  });
});

describe('isValidSort and narrowSort', () => {
  const config = {
    storageKey: 'test.sort',
    columns: ['name', 'size'],
    defaultSort: { column: 'name', direction: 'asc' },
  } as const;

  it('accepts a known column with a valid direction', () => {
    expect(isValidSort({ column: 'name', direction: 'asc' }, config)).toBe(true);
  });

  it('rejects unknown columns, bad directions, and non-objects', () => {
    expect(isValidSort({ column: 'other', direction: 'asc' }, config)).toBe(false);
    expect(isValidSort({ column: 'name', direction: 'up' }, config)).toBe(false);
    expect(isValidSort('junk', config)).toBe(false);
    expect(isValidSort(null, config)).toBe(false);
  });

  it('narrows to the config columns or the default sort', () => {
    expect(narrowSort(config, { column: 'size', direction: 'asc' })).toEqual({
      column: 'size',
      direction: 'asc',
    });
    expect(narrowSort(config, { column: 'other', direction: 'asc' })).toEqual(config.defaultSort);
    expect(narrowSort(config, null)).toEqual(config.defaultSort);
  });
});
