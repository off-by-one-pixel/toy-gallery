import { describe, expect, it } from 'vitest';

import { isRowReady, newRow, reconcileRows, sameDict, toDict, toRows } from '@/features/toys/gallery/attributesEditor';
import type { AttributeRow } from '@/api/types';

const lastIssuedId = () => newRow().rowId;

const savedRow = (rowId: number, key: string, value: string): AttributeRow => ({
  rowId,
  key,
  value,
  fromSaved: true,
});

const draftRow = (rowId: number, key: string, value: string): AttributeRow => ({
  rowId,
  key,
  value,
  fromSaved: false,
});

describe('toRows', () => {
  it('returns an empty array for undefined / empty input', () => {
    expect(toRows(undefined)).toEqual([]);
    expect(toRows({})).toEqual([]);
  });

  it('maps each key/value into a fromSaved row with a unique id', () => {
    const rows = toRows({ size: 'M', shade: 'blue' });
    expect(rows).toEqual([
      { rowId: expect.any(Number), key: 'size', value: 'M', fromSaved: true },
      { rowId: expect.any(Number), key: 'shade', value: 'blue', fromSaved: true },
    ]);
    expect(rows[0].rowId).not.toBe(rows[1].rowId);
  });
});

describe('isRowReady', () => {
  it('is false when the key is empty / whitespace', () => {
    expect(isRowReady(savedRow(1, '', 'v'))).toBe(false);
    expect(isRowReady(savedRow(1, '   ', 'v'))).toBe(false);
  });

  it('is true for a saved row with a cleared value (deletion is an edit)', () => {
    expect(isRowReady(savedRow(1, 'size', ''))).toBe(true);
  });

  it('is false for a new draft row with an empty value', () => {
    expect(isRowReady(draftRow(1, 'size', ''))).toBe(false);
  });

  it('is true for a new draft row with a non-empty value', () => {
    expect(isRowReady(draftRow(1, 'size', 'M'))).toBe(true);
  });
});

describe('toDict', () => {
  it('omits not-ready rows', () => {
    const rows = [savedRow(1, 'size', 'M'), draftRow(2, 'incomplete', ''), savedRow(3, '', 'orphan')];
    expect(toDict(rows)).toEqual({ size: 'M' });
  });

  it('trims keys but keeps values verbatim', () => {
    expect(toDict([savedRow(1, '  size  ', '  M  ')])).toEqual({ size: '  M  ' });
  });

  it('last writer wins when two rows have the same trimmed key', () => {
    const rows = [savedRow(1, 'size', 'M'), savedRow(2, 'size', 'L')];
    expect(toDict(rows)).toEqual({ size: 'L' });
  });
});

describe('sameDict', () => {
  it('is true for two empty dicts', () => {
    expect(sameDict({}, {})).toBe(true);
  });

  it('is true when keys + values match', () => {
    expect(sameDict({ a: '1', b: '2' }, { b: '2', a: '1' })).toBe(true);
  });

  it('is false when sizes differ', () => {
    expect(sameDict({ a: '1' }, { a: '1', b: '2' })).toBe(false);
  });

  it('is false when a shared key has different values', () => {
    expect(sameDict({ a: '1' }, { a: '2' })).toBe(false);
  });
});

describe('reconcileRows', () => {
  it('preserves rowIds for keys that survived', () => {
    const current = [savedRow(7, 'size', 'M'), savedRow(8, 'shade', 'blue')];
    const out = reconcileRows(current, { size: 'L', shade: 'blue' });
    expect(out.map((r) => r.rowId)).toEqual([7, 8]);
    expect(out.map((r) => r.value)).toEqual(['L', 'blue']);
  });

  it('assigns a fresh id to newly-arrived keys from the server', () => {
    const before = lastIssuedId();
    const out = reconcileRows([savedRow(7, 'size', 'M')], { size: 'M', shade: 'blue' });
    expect(out).toHaveLength(2);
    expect(out[0].rowId).toBe(7);
    expect(out[1]).toEqual({ rowId: expect.any(Number), key: 'shade', value: 'blue', fromSaved: true });
    expect(out[1].rowId).toBeGreaterThan(before);
  });

  it('drops saved rows whose key no longer exists on the server', () => {
    const out = reconcileRows([savedRow(7, 'size', 'M'), savedRow(8, 'stale', 'x')], { size: 'M' });
    expect(out.map((r) => r.key)).toEqual(['size']);
  });

  it('keeps draft rows whose key is not yet on the server', () => {
    const current = [savedRow(7, 'size', 'M'), draftRow(9, 'new', '')];
    const out = reconcileRows(current, { size: 'M' });
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual({ rowId: 9, key: 'new', value: '', fromSaved: false });
  });

  it('drops a draft row when the server confirms its key', () => {
    const before = lastIssuedId();
    const out = reconcileRows([draftRow(9, 'size', 'M')], { size: 'M' });
    expect(out).toEqual([{ rowId: expect.any(Number), key: 'size', value: 'M', fromSaved: true }]);
    expect(out[0].rowId).toBeGreaterThan(before);
  });
});

describe('newRow', () => {
  it('returns a blank draft row with a fresh id', () => {
    const before = lastIssuedId();
    const row = newRow();
    expect(row).toEqual({ rowId: expect.any(Number), key: '', value: '', fromSaved: false });
    expect(row.rowId).toBeGreaterThan(before);
  });

  it('gives every call a distinct id', () => {
    expect(newRow().rowId).not.toBe(newRow().rowId);
  });
});
