import { describe, expect, it } from 'vitest';

import {
  activeFilterCount,
  INVOLVEMENT_RANK,
  mergeSessions,
  NO_SESSION_FILTERS,
  parseToyIdsParam,
  sortEntriesByInvolvement,
  toggleToyFilter,
  toyTooltip,
  toysById,
} from '@/features/sessions/session';
import { Involvement, type Session, type SessionEntry, type Toy } from '@/api/types';

const session = (id: number, isoDay: string): Session => ({
  id,
  startedAt: `${isoDay}T10:00:00`,
  isLive: false,
  entries: [],
  maxInsertableLength: null,
  maxCircumference: null,
});

describe('INVOLVEMENT_RANK', () => {
  it('orders FULLY_INSERTED < INSERTED < USED', () => {
    expect(INVOLVEMENT_RANK[Involvement.FULLY_INSERTED]).toBeLessThan(INVOLVEMENT_RANK[Involvement.INSERTED]);
    expect(INVOLVEMENT_RANK[Involvement.INSERTED]).toBeLessThan(INVOLVEMENT_RANK[Involvement.USED]);
  });
});

describe('mergeSessions', () => {
  it('appends only unseen ids preserving order', () => {
    const a = session(1, '2026-06-05');
    const b = session(2, '2026-06-04');
    const c = session(3, '2026-06-03');
    expect(mergeSessions([a, b], [b, c]).map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it('handles empty sides', () => {
    const a = session(1, '2026-06-05');
    expect(mergeSessions([], [a]).map((s) => s.id)).toEqual([1]);
    expect(mergeSessions([a], []).map((s) => s.id)).toEqual([1]);
  });
});

describe('sortEntriesByInvolvement', () => {
  const toy = (id: number, circumference: number | null): Toy =>
    ({
      id,
      brand: 'B',
      name: `t${id}`,
      size: '',
      usageCount: 0,
      totalDurationMinutes: 0,
      circumference,
      shape: { sections: [] },
    }) as Toy;
  const toys = new Map([1, 2, 3, 4].map((id) => [id, toy(id, id === 4 ? 90 : 100 + id * 10)]));
  const entries: SessionEntry[] = [
    { toy: 1, involvement: Involvement.FULLY_INSERTED },
    { toy: 2, involvement: Involvement.USED },
    { toy: 3, involvement: Involvement.INSERTED },
  ];

  it('sorts by involvement rank, deepest first', () => {
    expect(sortEntriesByInvolvement(entries, toys).map((e) => e.toy)).toEqual([1, 3, 2]);
  });

  it('puts the biggest circumference first within the same involvement', () => {
    const sameRank: SessionEntry[] = [
      { toy: 4, involvement: Involvement.INSERTED },
      { toy: 3, involvement: Involvement.INSERTED },
      { toy: 2, involvement: Involvement.INSERTED },
    ];
    expect(sortEntriesByInvolvement(sameRank, toys).map((e) => e.toy)).toEqual([3, 2, 4]);
  });

  it('sorts unknown or unmeasured toys after measured ones', () => {
    const sameRank: SessionEntry[] = [
      { toy: 9, involvement: Involvement.USED },
      { toy: 3, involvement: Involvement.USED },
    ];
    expect(sortEntriesByInvolvement(sameRank, toys).map((e) => e.toy)).toEqual([3, 9]);
  });

  it('does not mutate the input', () => {
    const before = entries.map((e) => e.toy);
    sortEntriesByInvolvement(entries, toys);
    expect(entries.map((e) => e.toy)).toEqual(before);
  });
});

describe('toysById', () => {
  const t1: Toy = {
    id: 1,
    brand: 'A',
    name: 'a',
    size: '',
    usageCount: 0,
    totalDurationMinutes: 0,
    shape: { sections: [] },
  } as Toy;
  const t2: Toy = {
    id: 2,
    brand: 'B',
    name: 'b',
    size: '',
    usageCount: 0,
    totalDurationMinutes: 0,
    shape: { sections: [] },
  } as Toy;

  it('builds a map keyed by toy.id', () => {
    const map = toysById([t1, t2]);
    expect(map.get(1)).toBe(t1);
    expect(map.get(2)).toBe(t2);
  });

  it('returns an empty map for an empty input', () => {
    expect(toysById([]).size).toBe(0);
  });
});

describe('toyTooltip', () => {
  it('joins brand, name, size with single spaces', () => {
    expect(toyTooltip({ brand: 'Acme', name: 'Slim', size: 'M' } as Toy)).toBe('Acme Slim M');
  });

  it('omits empty parts', () => {
    expect(toyTooltip({ brand: 'Acme', name: 'Slim', size: '' } as Toy)).toBe('Acme Slim');
  });

  it('returns an empty string when every part is empty', () => {
    expect(toyTooltip({ brand: '', name: '', size: '' } as Toy)).toBe('');
  });
});

describe('session filters', () => {
  it('counts active filters across toys and media', () => {
    expect(activeFilterCount(NO_SESSION_FILTERS)).toBe(0);
    expect(activeFilterCount({ toyIds: [1, 2], hasMedia: true })).toBe(3);
  });

  it('toggles toy ids in and out', () => {
    const withToy = toggleToyFilter(NO_SESSION_FILTERS, 5);
    expect(withToy.toyIds).toEqual([5]);
    expect(toggleToyFilter(withToy, 5).toyIds).toEqual([]);
  });
});

describe('parseToyIdsParam', () => {
  it('parses comma-separated ids and drops junk', () => {
    expect(parseToyIdsParam('3,7')).toEqual([3, 7]);
    expect(parseToyIdsParam('3,junk,-1,0')).toEqual([3]);
    expect(parseToyIdsParam(null)).toEqual([]);
    expect(parseToyIdsParam('')).toEqual([]);
  });
});
