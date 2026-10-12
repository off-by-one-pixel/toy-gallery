import { describe, expect, it } from 'vitest';

import { sameDict } from '@/lib/sameDict';

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
