import { describe, expect, it } from 'vitest';

import { applyUpdate, buildHref, parseEnumParam, parseIntParam, type Update } from '@/hooks/useNavigation';

describe('applyUpdate', () => {
  it.each<[string, string, Update, string]>([
    ['sets a new key', '', { modal: 'new' }, 'modal=new'],
    ['overrides an existing key', 'modal=edit', { modal: 'copy' }, 'modal=copy'],
    ['deletes a key when value is null', 'modal=new&toyId=5', { modal: null }, 'toyId=5'],
    ['preserves unrelated params', 'details=42&unit=mm', { modal: 'new' }, 'details=42&unit=mm&modal=new'],
    ['applies multiple keys at once', '', { modal: 'edit', toyId: '7', stage: null }, 'modal=edit&toyId=7'],
  ])('%s', (_, current, update, expected) => {
    expect(applyUpdate(new URLSearchParams(current), update).toString()).toBe(expected);
  });

  it('does not mutate the input', () => {
    const current = new URLSearchParams('a=1');
    applyUpdate(current, { a: '2', b: '3' });
    expect(current.get('a')).toBe('1');
    expect(current.has('b')).toBe(false);
  });
});

describe('buildHref', () => {
  it('appends `?` + query string when params are present', () => {
    expect(buildHref('/', new URLSearchParams('modal=new'))).toBe('/?modal=new');
  });

  it('drops the `?` when there are no params', () => {
    expect(buildHref('/', new URLSearchParams())).toBe('/');
  });

  it('preserves a multi-segment pathname', () => {
    expect(buildHref('/sessions/edit', new URLSearchParams('id=5'))).toBe('/sessions/edit?id=5');
  });
});

describe('parseEnumParam', () => {
  it.each<[string | null, string | null]>([
    ['new', 'new'],
    ['password', null],
    [null, null],
  ])('maps %j to %j', (raw, expected) => {
    expect(parseEnumParam(raw, ['new', 'edit'] as const)).toBe(expected);
  });
});

describe('parseIntParam', () => {
  it.each<[string | null, number | null]>([
    ['42', 42],
    ['-7', -7],
    ['3.14', null],
    ['abc', null],
    ['', null],
    [null, null],
  ])('maps %j to %j', (raw, expected) => {
    expect(parseIntParam(raw)).toBe(expected);
  });
});
