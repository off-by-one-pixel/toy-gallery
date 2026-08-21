import { describe, expect, it } from 'vitest';

import { SESSION_SORT, sessionOrderingParam } from './sessionSort';
import { isColumnOf } from '@/lib/sort';

describe('sessionOrderingParam', () => {
  it('maps sort state to the ordering query value', () => {
    expect(sessionOrderingParam({ column: 'started_at', direction: 'asc' })).toBe('started_at');
    expect(sessionOrderingParam({ column: 'duration', direction: 'desc' })).toBe('-duration');
  });

  it('returns undefined for no sort', () => {
    expect(sessionOrderingParam(null)).toBeUndefined();
  });
});

describe('SESSION_SORT config', () => {
  it('accepts known columns and rejects others', () => {
    expect(isColumnOf(SESSION_SORT, 'duration')).toBe(true);
    expect(isColumnOf(SESSION_SORT, 'name')).toBe(false);
    expect(isColumnOf(SESSION_SORT, 7)).toBe(false);
  });
});
