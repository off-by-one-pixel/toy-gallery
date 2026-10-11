import { describe, expect, it } from 'vitest';

import { applyUpdate, buildHref, parseEnumParam, parseIntParam } from '@/hooks/useNavigation';

describe('applyUpdate', () => {
  it('sets a new key', () => {
    const out = applyUpdate(new URLSearchParams(), { modal: 'new' });
    expect(out.get('modal')).toBe('new');
  });

  it('overrides an existing key', () => {
    const out = applyUpdate(new URLSearchParams('modal=edit'), { modal: 'copy' });
    expect(out.get('modal')).toBe('copy');
  });

  it('deletes a key when value is null', () => {
    const out = applyUpdate(new URLSearchParams('modal=new&toyId=5'), { modal: null });
    expect(out.has('modal')).toBe(false);
    expect(out.get('toyId')).toBe('5');
  });

  it('preserves params not mentioned in the update', () => {
    const out = applyUpdate(new URLSearchParams('details=42&unit=mm'), { modal: 'new' });
    expect(out.get('details')).toBe('42');
    expect(out.get('unit')).toBe('mm');
    expect(out.get('modal')).toBe('new');
  });

  it('applies multiple keys at once', () => {
    const out = applyUpdate(new URLSearchParams(), { modal: 'edit', toyId: '7', stage: null });
    expect(out.get('modal')).toBe('edit');
    expect(out.get('toyId')).toBe('7');
    expect(out.has('stage')).toBe(false);
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
  it('returns the value when it matches one in the allowed list', () => {
    expect(parseEnumParam('new', ['new', 'edit'] as const)).toBe('new');
  });

  it('returns null when the value is not in the allowed list', () => {
    expect(parseEnumParam('password', ['new', 'edit'] as const)).toBeNull();
  });

  it('returns null when the raw value is null', () => {
    expect(parseEnumParam(null, ['new'] as const)).toBeNull();
  });

  it('narrows the return type to the allowed union', () => {
    const allowed = ['template', 'editor'] as const;
    const result = parseEnumParam('editor', allowed);
    expect(result).toBe('editor');
  });
});

describe('parseIntParam', () => {
  it('parses a positive integer string', () => {
    expect(parseIntParam('42')).toBe(42);
  });

  it('parses a negative integer string', () => {
    expect(parseIntParam('-7')).toBe(-7);
  });

  it('returns null for a decimal value', () => {
    expect(parseIntParam('3.14')).toBeNull();
  });

  it('returns null for non-numeric values', () => {
    expect(parseIntParam('abc')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseIntParam('')).toBeNull();
  });

  it('returns null when raw is null', () => {
    expect(parseIntParam(null)).toBeNull();
  });
});
