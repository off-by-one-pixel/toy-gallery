import { describe, expect, it } from 'vitest';

import { INVOLVEMENT_RANK, mergeSessions, sortEntriesByInvolvement, toyTooltip, toysById } from '@/services/session';
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
  it('orders USED < INSERTED < FULLY_INSERTED', () => {
    expect(INVOLVEMENT_RANK[Involvement.USED]).toBeLessThan(INVOLVEMENT_RANK[Involvement.INSERTED]);
    expect(INVOLVEMENT_RANK[Involvement.INSERTED]).toBeLessThan(INVOLVEMENT_RANK[Involvement.FULLY_INSERTED]);
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
