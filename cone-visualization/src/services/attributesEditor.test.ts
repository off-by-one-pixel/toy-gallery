import { beforeEach, describe, expect, it } from 'vitest';

import { type IdFactory, isRowReady, newRow, reconcileRows, sameDict, toDict, toRows } from './attributesEditor';
import type { AttributeRow } from './types';

// Each test resets its own counter so row ids are deterministic.
let next: number;
const ids: IdFactory = () => ++next;
beforeEach(() => {
  next = 0;
});

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
    expect(toRows(undefined, ids)).toEqual([]);
    expect(toRows({}, ids)).toEqual([]);
  });

  it('maps each key/value into a fromSaved row with a unique id', () => {
    const rows = toRows({ size: 'M', shade: 'blue' }, ids);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ rowId: 1, key: 'size', value: 'M', fromSaved: true });
    expect(rows[1]).toEqual({ rowId: 2, key: 'shade', value: 'blue', fromSaved: true });
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
    const out = reconcileRows(current, { size: 'L', shade: 'blue' }, ids);
    expect(out.map((r) => r.rowId)).toEqual([7, 8]);
    expect(out.map((r) => r.value)).toEqual(['L', 'blue']);
  });

  it('assigns a fresh id to newly-arrived keys from the server', () => {
    const out = reconcileRows([savedRow(7, 'size', 'M')], { size: 'M', shade: 'blue' }, ids);
    expect(out).toHaveLength(2);
    expect(out[0].rowId).toBe(7);
    expect(out[1]).toEqual({ rowId: 1, key: 'shade', value: 'blue', fromSaved: true });
  });

  it('drops saved rows whose key no longer exists on the server', () => {
    const out = reconcileRows([savedRow(7, 'size', 'M'), savedRow(8, 'stale', 'x')], { size: 'M' }, ids);
    expect(out.map((r) => r.key)).toEqual(['size']);
  });

  it('keeps draft rows whose key is not yet on the server', () => {
    const current = [savedRow(7, 'size', 'M'), draftRow(9, 'new', '')];
    const out = reconcileRows(current, { size: 'M' }, ids);
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual({ rowId: 9, key: 'new', value: '', fromSaved: false });
  });

  it('drops a draft row when the server confirms its key', () => {
    const current = [draftRow(9, 'size', 'M')];
    const out = reconcileRows(current, { size: 'M' }, ids);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ rowId: 1, key: 'size', value: 'M', fromSaved: true });
  });
});

describe('newRow', () => {
  it('returns a blank draft row with a fresh id', () => {
    expect(newRow(ids)).toEqual({ rowId: 1, key: '', value: '', fromSaved: false });
  });

  it('gives every call a distinct id', () => {
    expect(newRow(ids).rowId).toBe(1);
    expect(newRow(ids).rowId).toBe(2);
  });
});
