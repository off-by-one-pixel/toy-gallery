import { describe, expect, it } from 'vitest';

import type { Challenge } from '@/api/types';
import { CHALLENGE_DISPLAY, type ChallengeDisplayContext } from '@/features/challenges/challenges';
import { Unit } from '@/features/preferences/units';
import { enTranslator } from '@/test/translator';

const NOW = new Date(2026, 10, 19, 12);

const ctx = (overrides: Partial<ChallengeDisplayContext> = {}): ChallengeDisplayContext => ({
  t: enTranslator,
  girth: 'circumference',
  unit: Unit.mm,
  locale: 'en',
  now: NOW,
  ...overrides,
});

const challenge = (overrides: Partial<Challenge>): Challenge => ({
  kind: 'time',
  toy: 1,
  points: 0,
  target: null,
  best: null,
  reasons: [],
  sessionCount: 1,
  lastUsedAt: null,
  averageMinutes: null,
  ...overrides,
});

const show = (item: Challenge, context: ChallengeDisplayContext = ctx()) => {
  const display = CHALLENGE_DISPLAY[item.kind];
  return { target: display.target(item, context), chips: display.chips(item, context) };
};

const daysAgo = (days: number) => new Date(2026, 10, 19 - days, 9).toISOString();

describe('CHALLENGE_DISPLAY', () => {
  it('asks for a first session on a new toy', () => {
    expect(show(challenge({ kind: 'new-toy', sessionCount: 0 }))).toEqual({
      target: { label: 'First session' },
      chips: ['New toy'],
    });
  });

  it('names the girth target, the step, the record and a recent use', () => {
    const girth = challenge({ kind: 'girth', target: 210, best: 200, reasons: ['recent-use'], lastUsedAt: daysAgo(3) });
    expect(show(girth)).toEqual({
      target: { label: 'Insert', value: { text: '210', suffix: 'mm' } },
      chips: ['+10 mm girth', 'Best 200 mm', 'Used 3 days ago'],
    });
  });

  it('shows girth values and the step as a diameter when the user prefers it', () => {
    const girth = show(
      challenge({ kind: 'girth', target: 100 * Math.PI, best: 95 * Math.PI }),
      ctx({ girth: 'diameter' }),
    );
    expect(girth.target.value).toEqual({ text: '100', suffix: 'mm' });
    expect(girth.chips[0]).toBe('+5 mm girth');
  });

  it('asks for a full insertion on the depth target', () => {
    expect(show(challenge({ kind: 'depth', target: 205, best: 200 }))).toEqual({
      target: { label: 'Fully insert', value: { text: '205', suffix: 'mm' } },
      chips: ['+5 mm length', 'Best 200 mm'],
    });
  });

  it('shows the step in the unit the user prefers', () => {
    const depth = challenge({ kind: 'depth', target: 14 * 25.4, best: 12.2 * 25.4 });
    expect(show(depth, ctx({ unit: Unit.in })).chips[0]).toBe('+1.80 in length');
  });

  it('says yesterday for a use on the previous day', () => {
    const depth = challenge({ kind: 'depth', target: 205, best: 200, reasons: ['recent-use'], lastUsedAt: daysAgo(1) });
    expect(show(depth).chips).toContain('Used yesterday');
  });

  it('shows when an old toy was last used and how often', () => {
    const old = challenge({ kind: 'old-toy', sessionCount: 25, lastUsedAt: '2026-08-14T10:00:00Z' });
    expect(show(old)).toEqual({ target: { label: 'Use it again' }, chips: ['Not used since Aug 2026', 'Used 25×'] });
  });

  it('asks for a logged time when the toy has no time record', () => {
    expect(show(challenge({ kind: 'time' }))).toEqual({ target: { label: 'Log a time' }, chips: [] });
  });

  it('names the time to beat and the average when it is near the record', () => {
    const time = challenge({ kind: 'time', target: 26, best: 25, reasons: ['near-record'], averageMinutes: 22.4 });
    expect(show(time)).toEqual({ target: { label: 'Beat', value: { text: '25m' } }, chips: ['Avg 22m, best 25m'] });
  });
});
