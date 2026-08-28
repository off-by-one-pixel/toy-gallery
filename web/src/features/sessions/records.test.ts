import { describe, expect, it } from 'vitest';

import { recordDisplay, SESSION_RECORDS, type RecordLabelContext } from '@/features/sessions/records';

const ctx = (overrides: Partial<RecordLabelContext> = {}): RecordLabelContext => ({
  t: (key) => key,
  girth: 'circumference',
  ...overrides,
});

describe('SESSION_RECORDS', () => {
  it('defines a display for every seed record key', () => {
    expect(Object.keys(SESSION_RECORDS).sort()).toEqual(['pr-depth', 'pr-width']);
  });

  it('maps each key to its peak row', () => {
    expect(SESSION_RECORDS['pr-width'].peak).toBe('circumference');
    expect(SESSION_RECORDS['pr-depth'].peak).toBe('length');
  });

  it('labels width by the girth preference', () => {
    expect(SESSION_RECORDS['pr-width'].label(ctx())).toBe('records.width.circumference');
    expect(SESSION_RECORDS['pr-width'].label(ctx({ girth: 'diameter' }))).toBe('records.width.diameter');
    expect(SESSION_RECORDS['pr-depth'].label(ctx())).toBe('records.depth');
  });
});

describe('recordDisplay', () => {
  it('resolves known keys and rejects unknown ones', () => {
    expect(recordDisplay('pr-depth')).toBe(SESSION_RECORDS['pr-depth']);
    expect(recordDisplay('pr-future')).toBeUndefined();
  });
});
