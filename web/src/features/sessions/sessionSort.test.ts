import { describe, expect, it } from 'vitest';

import { SESSION_SORT, sessionOrderingParam } from '@/features/sessions/sessionSort';
import { expectSortConfigGuard } from '@/test/sortConfig';

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
    expectSortConfigGuard(SESSION_SORT, ['name', 7]);
  });
});
