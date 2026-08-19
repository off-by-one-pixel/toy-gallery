import { describe, expect, it } from 'vitest';

import { filterSessions, INVOLVEMENT_RANK, sortEntriesByInvolvement, toyTooltip, toysById } from './session';
import { Involvement, type Session, type SessionEntry, type Toy } from './types';

const NOW = new Date(2026, 4, 16, 10, 0); // 2026-05-16 10:00 local

const session = (id: number, isoDay: string): Session => ({
  id,
  startedAt: `${isoDay}T10:00:00`,
  isLive: false,
  entries: [],
  maxInsertableLength: null,
  maxCircumference: null,
});

describe('filterSessions', () => {
  const today = session(1, '2026-05-16');
  const yesterday = session(2, '2026-05-15');
  // Comfortably outside a 7-day window from NOW (2026-05-16 10:00) but
  // still inside the 30-day one.
  const lastWeek = session(3, '2026-05-07');
  // Outside both 7- and 30-day windows.
  const lastMonth = session(4, '2026-04-10');
  const longAgo = session(5, '2025-01-01');
  const all = [today, yesterday, lastWeek, lastMonth, longAgo];

  it('returns every session for filter=all', () => {
    expect(filterSessions(all, 'all', NOW).map((s) => s.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns only sessions within 7 days for filter=week', () => {
    expect(filterSessions(all, 'week', NOW).map((s) => s.id)).toEqual([1, 2]);
  });

  it('returns only sessions within 30 days for filter=month', () => {
    expect(filterSessions(all, 'month', NOW).map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it('returns a copy, not the input array', () => {
    const result = filterSessions(all, 'all', NOW);
    expect(result).not.toBe(all);
    expect(result).toEqual([...all]);
  });
});

describe('INVOLVEMENT_RANK', () => {
  it('orders USED < INSERTED < FULLY_INSERTED', () => {
    expect(INVOLVEMENT_RANK[Involvement.USED]).toBeLessThan(INVOLVEMENT_RANK[Involvement.INSERTED]);
    expect(INVOLVEMENT_RANK[Involvement.INSERTED]).toBeLessThan(INVOLVEMENT_RANK[Involvement.FULLY_INSERTED]);
  });
});

describe('sortEntriesByInvolvement', () => {
  const entries: SessionEntry[] = [
    { toy: 1, involvement: Involvement.FULLY_INSERTED },
    { toy: 2, involvement: Involvement.USED },
    { toy: 3, involvement: Involvement.INSERTED },
  ];

  it('sorts ascending by involvement rank', () => {
    expect(sortEntriesByInvolvement(entries).map((e) => e.toy)).toEqual([2, 3, 1]);
  });

  it('does not mutate the input', () => {
    const before = entries.map((e) => e.toy);
    sortEntriesByInvolvement(entries);
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
