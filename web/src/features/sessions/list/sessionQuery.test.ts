import { describe, expect, it } from 'vitest';

import { sessionListKey, sessionListQuery, type SessionListQueryState } from '@/features/sessions/list/sessionQuery';
import { filterStartDate, parseSessionFilters } from '@/features/sessions/session';
import { sessionOrderingParam } from '@/features/sessions/sessionSort';

const filters = (params: Record<string, string> = {}) => parseSessionFilters((name) => params[name] ?? null);

const state = (overrides: Partial<SessionListQueryState> = {}): SessionListQueryState => ({
  filter: 'all',
  sort: null,
  filters: filters(),
  ...overrides,
});

describe('sessionListQuery', () => {
  it('assembles the fetch arguments from every query dimension', () => {
    const sort = { column: 'duration', direction: 'desc' } as const;
    const active = filters({ toys: '1,2', media: '1' });
    expect(sessionListQuery(state({ filter: 'week', sort, filters: active }), 3)).toEqual({
      page: 3,
      start: filterStartDate('week'),
      ordering: sessionOrderingParam(sort),
      filters: active,
    });
  });

  it('leaves window and ordering unset for the default state', () => {
    const query = sessionListQuery(state(), 1);
    expect(query.start).toBeUndefined();
    expect(query.ordering).toBeUndefined();
  });
});

describe('sessionListKey', () => {
  it('is stable for equal state', () => {
    expect(sessionListKey(state())).toEqual(sessionListKey(state()));
  });

  it('changes when any query dimension changes', () => {
    const base = sessionListKey(state());
    expect(sessionListKey(state({ filter: 'week' }))).not.toEqual(base);
    expect(sessionListKey(state({ sort: { column: 'duration', direction: 'asc' } }))).not.toEqual(base);
    expect(sessionListKey(state({ filters: filters({ media: '1' }) }))).not.toEqual(base);
  });
});
