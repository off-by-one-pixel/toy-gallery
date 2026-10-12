import { describe, expect, it } from 'vitest';

import { Involvement } from '@/api/types';
import {
  isLiveOpen,
  selectionsFromSession,
  sessionPayload,
  sessionSaveKind,
  type ToySelections,
  withDuration,
  withInvolvement,
} from '@/features/sessions/form/sessionDraft';
import { datetimeLocalValue } from '@/lib/dates';
import { makeSession } from '@/test/fixtures';

const STARTED_AT = '2026-08-22T08:00:00Z';
const localStart = datetimeLocalValue(new Date(STARTED_AT));
const earlierStart = datetimeLocalValue(new Date('2026-08-22T07:00:00Z'));
const used: ToySelections = new Map([[1, { involvement: Involvement.USED, durationMinutes: 20 }]]);
const none: ToySelections = new Map();

describe('selectionsFromSession', () => {
  it('starts empty without a session', () => {
    expect(selectionsFromSession(null).size).toBe(0);
  });

  it('maps each entry to its toy and defaults a missing duration to null', () => {
    const session = makeSession({
      entries: [
        { toy: 1, involvement: Involvement.USED, durationMinutes: 20 },
        { toy: 2, involvement: Involvement.INSERTED },
      ],
    });
    expect([...selectionsFromSession(session)]).toEqual([
      [1, { involvement: Involvement.USED, durationMinutes: 20 }],
      [2, { involvement: Involvement.INSERTED, durationMinutes: null }],
    ]);
  });
});

describe('withInvolvement', () => {
  it('adds a new toy without a duration', () => {
    expect(withInvolvement(none, 2, Involvement.INSERTED).get(2)).toEqual({
      involvement: Involvement.INSERTED,
      durationMinutes: null,
    });
  });

  it('keeps the duration when the involvement changes', () => {
    expect(withInvolvement(used, 1, Involvement.FULLY_INSERTED).get(1)).toEqual({
      involvement: Involvement.FULLY_INSERTED,
      durationMinutes: 20,
    });
  });

  it('removes the toy when the involvement is cleared', () => {
    expect(withInvolvement(used, 1, null).has(1)).toBe(false);
  });

  it('leaves the given selections unchanged', () => {
    withInvolvement(used, 1, null);
    expect(used.has(1)).toBe(true);
  });
});

describe('withDuration', () => {
  it('sets the duration of a selected toy', () => {
    expect(withDuration(used, 1, 45).get(1)).toEqual({ involvement: Involvement.USED, durationMinutes: 45 });
  });

  it('ignores a toy that is not selected', () => {
    expect(withDuration(used, 2, 45)).toBe(used);
  });
});

describe('isLiveOpen', () => {
  it('is open for a live session without an end time', () => {
    expect(isLiveOpen(makeSession({ isLive: true }), '')).toBe(true);
  });

  it('is closed once an end time is entered', () => {
    expect(isLiveOpen(makeSession({ isLive: true }), '2026-08-22T09:00')).toBe(false);
  });

  it('is closed for a finished session and without a session', () => {
    expect(isLiveOpen(makeSession(), '')).toBe(false);
    expect(isLiveOpen(null, '')).toBe(false);
  });
});

describe('sessionSaveKind', () => {
  const live = makeSession({ startedAt: STARTED_AT, isLive: true });
  const finished = makeSession({ startedAt: STARTED_AT });

  it('saves everything once a toy is selected, live or not', () => {
    expect(sessionSaveKind(null, { startedAt: localStart, endedAt: '', selections: used })).toBe('full');
    expect(sessionSaveKind(live, { startedAt: localStart, endedAt: '', selections: used })).toBe('full');
  });

  it('saves only the start of an open live session without toys when the start changed', () => {
    expect(sessionSaveKind(live, { startedAt: earlierStart, endedAt: '', selections: none })).toBe('startOnly');
  });

  it('refuses an open live session without toys when the start is unchanged', () => {
    expect(sessionSaveKind(live, { startedAt: localStart, endedAt: '', selections: none })).toBeNull();
  });

  it('refuses a live session being ended without toys', () => {
    expect(
      sessionSaveKind(live, { startedAt: earlierStart, endedAt: '2026-08-22T09:00', selections: none }),
    ).toBeNull();
  });

  it('refuses a new or finished session without toys', () => {
    expect(sessionSaveKind(null, { startedAt: earlierStart, endedAt: '', selections: none })).toBeNull();
    expect(sessionSaveKind(finished, { startedAt: earlierStart, endedAt: '', selections: none })).toBeNull();
  });
});

describe('sessionPayload', () => {
  it('converts the local times to ISO and lists each selected toy', () => {
    expect(sessionPayload({ startedAt: '2026-08-22T08:00', endedAt: '2026-08-22T09:30', selections: used })).toEqual({
      startedAt: new Date('2026-08-22T08:00').toISOString(),
      endedAt: new Date('2026-08-22T09:30').toISOString(),
      entries: [{ toy: 1, involvement: Involvement.USED, durationMinutes: 20 }],
    });
  });

  it('sends no end time when it is empty', () => {
    expect(sessionPayload({ startedAt: '2026-08-22T08:00', endedAt: '', selections: none }).endedAt).toBeNull();
  });
});
