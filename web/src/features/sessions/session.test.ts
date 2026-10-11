import { describe, expect, it } from 'vitest';

import {
  activeFilterCount,
  ALL_PERIOD,
  canStepForward,
  currentPeriod,
  parsePeriodParam,
  periodKey,
  periodLabel,
  periodRange,
  periodUrlParam,
  stepPeriod,
  parseSessionFilters,
  parseTimeWindowParam,
  setTimeWindowFilter,
  sessionFiltersKey,
  sessionFiltersUrlParams,
  sessionFilterWireParams,
  INVOLVEMENT_RANK,
  mergeSessions,
  NO_SESSION_FILTERS,
  parseToyIdsParam,
  sortEntriesByInvolvement,
  toggleToyFilter,
  toyTooltip,
  toysById,
} from '@/features/sessions/session';
import { Involvement, type SessionEntry } from '@/api/types';
import { makeSession, makeToy } from '@/test/fixtures';

describe('INVOLVEMENT_RANK', () => {
  it('orders FULLY_INSERTED < INSERTED < USED', () => {
    expect(INVOLVEMENT_RANK[Involvement.FULLY_INSERTED]).toBeLessThan(INVOLVEMENT_RANK[Involvement.INSERTED]);
    expect(INVOLVEMENT_RANK[Involvement.INSERTED]).toBeLessThan(INVOLVEMENT_RANK[Involvement.USED]);
  });
});

describe('mergeSessions', () => {
  it('appends only unseen ids preserving order', () => {
    const a = makeSession({ id: 1 });
    const b = makeSession({ id: 2 });
    const c = makeSession({ id: 3 });
    expect(mergeSessions([a, b], [b, c]).map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it('handles empty sides', () => {
    const a = makeSession({ id: 1 });
    expect(mergeSessions([], [a]).map((s) => s.id)).toEqual([1]);
    expect(mergeSessions([a], []).map((s) => s.id)).toEqual([1]);
  });
});

describe('sortEntriesByInvolvement', () => {
  const toys = new Map([1, 2, 3, 4].map((id) => [id, makeToy({ id, circumference: id === 4 ? 90 : 100 + id * 10 })]));
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
  it('builds a map keyed by toy.id', () => {
    const t1 = makeToy({ id: 1 });
    const t2 = makeToy({ id: 2 });
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
    expect(toyTooltip(makeToy({ brand: 'Acme', name: 'Slim', size: 'M' }))).toBe('Acme Slim M');
  });

  it('omits empty parts', () => {
    expect(toyTooltip(makeToy({ brand: 'Acme', name: 'Slim', size: '' }))).toBe('Acme Slim');
  });

  it('returns an empty string when every part is empty', () => {
    expect(toyTooltip(makeToy({ brand: '', name: '', size: '' }))).toBe('');
  });
});

describe('session filters', () => {
  it('counts active filters across toys and media', () => {
    expect(activeFilterCount(NO_SESSION_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...NO_SESSION_FILTERS, toyIds: [1, 2], hasMedia: true })).toBe(3);
    expect(activeFilterCount({ ...NO_SESSION_FILTERS, hasMedia: true, hasPr: true })).toBe(2);
  });

  it('toggles toy ids in and out', () => {
    const withToy = toggleToyFilter(NO_SESSION_FILTERS, 5);
    expect(withToy.toyIds).toEqual([5]);
    expect(toggleToyFilter(withToy, 5).toyIds).toEqual([]);
  });

  it('counts and keys the time window as one filter', () => {
    const filters = setTimeWindowFilter(NO_SESSION_FILTERS, { from: 18, to: 20 });
    expect(activeFilterCount(filters)).toBe(1);
    expect(sessionFiltersKey(filters)).toBe('||18-20');
    expect(setTimeWindowFilter(filters, null)).toEqual(NO_SESSION_FILTERS);
  });

  it('round-trips the time window through url params and sends wire hours', () => {
    const filters = setTimeWindowFilter(NO_SESSION_FILTERS, { from: 18, to: 20 });
    const params = sessionFiltersUrlParams(filters);
    expect(params.time).toBe('18-20');
    const map = new Map(Object.entries(params).filter(([, v]) => v !== null) as [string, string][]);
    expect(parseSessionFilters((name) => map.get(name) ?? null)).toEqual(filters);
    expect(sessionFilterWireParams(filters)).toEqual({ time_from: 18, time_to: 20 });
  });
});

describe('parseTimeWindowParam', () => {
  it('parses valid hour ranges', () => {
    expect(parseTimeWindowParam('18-20')).toEqual({ from: 18, to: 20 });
    expect(parseTimeWindowParam('0-24')).toEqual({ from: 0, to: 24 });
  });

  it('rejects malformed, empty, or out-of-range windows', () => {
    expect(parseTimeWindowParam(null)).toBeNull();
    expect(parseTimeWindowParam('18')).toBeNull();
    expect(parseTimeWindowParam('5-5')).toBeNull();
    expect(parseTimeWindowParam('25-3')).toBeNull();
    expect(parseTimeWindowParam('22-0')).toBeNull();
    expect(parseTimeWindowParam('22-2')).toBeNull();
    expect(parseTimeWindowParam('junk')).toBeNull();
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

describe('session flag filter registry', () => {
  it('parses url params through the registry', () => {
    const params = new Map([
      ['toys', '1,2'],
      ['pr', '1'],
    ]);
    const filters = parseSessionFilters((name) => params.get(name) ?? null);
    expect(filters).toEqual({ ...NO_SESSION_FILTERS, toyIds: [1, 2], hasPr: true });
  });

  it('round-trips filters through url params', () => {
    const filters = { ...NO_SESSION_FILTERS, toyIds: [3], hasMedia: true };
    const params = sessionFiltersUrlParams(filters);
    expect(params).toEqual({ toys: '3', time: null, media: '1', pr: null });
    const map = new Map(Object.entries(params).filter(([, v]) => v !== null) as [string, string][]);
    expect(parseSessionFilters((name) => map.get(name) ?? null)).toEqual(filters);
  });

  it('builds cache keys and wire params from active flags', () => {
    const filters = { ...NO_SESSION_FILTERS, toyIds: [1], hasMedia: true, hasPr: true };
    expect(sessionFiltersKey(filters)).toBe('1|mr|');
    expect(sessionFilterWireParams(filters)).toEqual({ toys: [1], has_media: true, has_pr: true });
    expect(sessionFilterWireParams(NO_SESSION_FILTERS)).toEqual({});
  });
});

describe('periods', () => {
  const now = new Date(2026, 8, 9);

  it('anchors the current week to monday and the current month to the first', () => {
    expect(currentPeriod('all', now)).toEqual(ALL_PERIOD);
    expect(currentPeriod('week', now)).toEqual({ kind: 'week', anchor: '2026-09-07' });
    expect(currentPeriod('month', now)).toEqual({ kind: 'month', anchor: '2026-09-01' });
    expect(currentPeriod('week', new Date(2026, 8, 13))).toEqual({ kind: 'week', anchor: '2026-09-07' });
  });

  it('steps backwards and clamps forward stepping at the current period', () => {
    const week = currentPeriod('week', now);
    expect(stepPeriod(week, -1, now)).toEqual({ kind: 'week', anchor: '2026-08-31' });
    expect(stepPeriod(week, 1, now)).toBe(week);
    expect(canStepForward(week, now)).toBe(false);
    expect(canStepForward(stepPeriod(week, -1, now), now)).toBe(true);
    expect(stepPeriod({ kind: 'month', anchor: '2026-01-01' }, -1, now)).toEqual({
      kind: 'month',
      anchor: '2025-12-01',
    });
    expect(stepPeriod(ALL_PERIOD, -1, now)).toBe(ALL_PERIOD);
  });

  it('produces an inclusive last-day range per period', () => {
    expect(periodRange(ALL_PERIOD)).toEqual({});
    expect(periodRange({ kind: 'week', anchor: '2026-09-07' })).toEqual({ start: '2026-09-07', end: '2026-09-13' });
    expect(periodRange({ kind: 'month', anchor: '2025-12-01' })).toEqual({ start: '2025-12-01', end: '2025-12-31' });
  });

  it('round-trips periods through the url param', () => {
    expect(periodUrlParam(ALL_PERIOD)).toBeNull();
    expect(periodUrlParam({ kind: 'week', anchor: '2026-09-07' })).toBe('w2026-09-07');
    expect(periodUrlParam({ kind: 'month', anchor: '2026-05-01' })).toBe('m2026-05');
    expect(parsePeriodParam('w2026-09-07', now)).toEqual({ kind: 'week', anchor: '2026-09-07' });
    expect(parsePeriodParam('m2026-05', now)).toEqual({ kind: 'month', anchor: '2026-05-01' });
  });

  it('normalizes off-anchor params and clamps future ones to the current period', () => {
    expect(parsePeriodParam('w2026-09-02', now)).toEqual({ kind: 'week', anchor: '2026-08-31' });
    expect(parsePeriodParam('w2026-09-14', now)).toEqual({ kind: 'week', anchor: '2026-09-07' });
    expect(parsePeriodParam('m2026-12', now)).toEqual({ kind: 'month', anchor: '2026-09-01' });
    expect(parsePeriodParam('garbage', now)).toEqual(ALL_PERIOD);
    expect(parsePeriodParam(null, now)).toEqual(ALL_PERIOD);
  });

  it('labels months by name and weeks by day range', () => {
    expect(periodLabel({ kind: 'month', anchor: '2026-09-01' }, 'en-US', now)).toBe('September');
    expect(periodLabel({ kind: 'month', anchor: '2025-11-01' }, 'en-US', now)).toBe('November 2025');
    expect(periodLabel({ kind: 'week', anchor: '2026-09-07' }, 'en-US', now)).toBe('Sep 7 \u2013 13');
    expect(periodLabel({ kind: 'week', anchor: '2026-09-28' }, 'en-US', now)).toBe('Sep 28 \u2013 Oct 4');
    expect(periodLabel({ kind: 'week', anchor: '2025-12-29' }, 'en-US', now)).toBe('Dec 29 \u2013 Jan 4, 2025');
    expect(periodLabel(ALL_PERIOD, 'en-US', now)).toBe('');
  });

  it('builds distinct cache keys per period', () => {
    expect(periodKey(ALL_PERIOD)).toBe('all');
    expect(periodKey({ kind: 'week', anchor: '2026-09-07' })).toBe('week:2026-09-07');
    expect(periodKey({ kind: 'month', anchor: '2026-09-01' })).toBe('month:2026-09-01');
  });
});
