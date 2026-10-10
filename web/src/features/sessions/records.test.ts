import { describe, expect, it } from 'vitest';

import { recordDisplay, SESSION_RECORDS, type RecordDisplayContext } from '@/features/sessions/records';
import { Unit } from '@/features/preferences/units';
import en from '@/i18n/catalogs/en.json';
import { enTranslator } from '@/test/translator';

const ctx = (overrides: Partial<RecordDisplayContext> = {}): RecordDisplayContext => ({
  t: enTranslator,
  girth: 'circumference',
  unit: Unit.mm,
  locale: 'en',
  ...overrides,
});

describe('SESSION_RECORDS', () => {
  it('defines a display for every seed record key', () => {
    expect(Object.keys(SESSION_RECORDS).sort()).toEqual([
      'pr-depth',
      'pr-duration',
      'pr-time',
      'pr-width',
      'toy-level',
      'toy-time',
    ]);
  });

  it('maps the session records to their peak rows', () => {
    expect(SESSION_RECORDS['pr-width'].peak).toBe('circumference');
    expect(SESSION_RECORDS['pr-depth'].peak).toBe('length');
    expect(recordDisplay('toy-time')?.peak).toBeUndefined();
    expect(SESSION_RECORDS['pr-time'].peak).toBe('duration');
    expect(recordDisplay('pr-duration')?.peak).toBeUndefined();
    expect(recordDisplay('toy-level')?.peak).toBeUndefined();
  });

  it('labels width by the girth preference', () => {
    expect(SESSION_RECORDS['pr-width'].label(ctx())).toBe(en.session.records.width.circumference);
    expect(SESSION_RECORDS['pr-width'].label(ctx({ girth: 'diameter' }))).toBe(en.session.records.width.diameter);
    expect(SESSION_RECORDS['pr-depth'].label(ctx())).toBe(en.session.records.depth);
    expect(SESSION_RECORDS['toy-time'].label(ctx())).toBe(en.session.records.time);
    expect(SESSION_RECORDS['pr-time'].label(ctx())).toBe(en.session.records.plugged);
    expect(SESSION_RECORDS['pr-duration'].label(ctx())).toBe(en.session.records.session);
    expect(SESSION_RECORDS['toy-level'].label(ctx())).toBe(en.session.records.level);
  });

  it('formats dimension values in the display unit with a suffix', () => {
    expect(SESSION_RECORDS['pr-depth'].value(180, ctx())).toEqual({ text: '180', suffix: 'mm' });
    expect(SESSION_RECORDS['pr-width'].value(254, ctx({ unit: Unit.in }))).toEqual({
      text: '10.00',
      suffix: 'in',
    });
  });

  it('converts width to a diameter when preferred', () => {
    const { text } = SESSION_RECORDS['pr-width'].value(Math.PI * 100, ctx({ girth: 'diameter' }));
    expect(text).toBe('100');
  });

  it('formats time records as elapsed duration without a unit suffix', () => {
    expect(SESSION_RECORDS['toy-time'].value(90, ctx())).toEqual({ text: '1h 30m' });
    expect(SESSION_RECORDS['pr-time'].value(45, ctx())).toEqual({ text: '45m' });
    expect(SESSION_RECORDS['pr-duration'].value(120, ctx())).toEqual({ text: '2h 0m' });
  });

  it('formats level records as the involvement label', () => {
    expect(SESSION_RECORDS['toy-level'].value(0, ctx()).text).toBe(en.involvement.USED);
    expect(SESSION_RECORDS['toy-level'].value(1, ctx()).text).toBe(en.involvement.INSERTED);
    expect(SESSION_RECORDS['toy-level'].value(2, ctx()).text).toBe(en.involvement.FULLY_INSERTED);
  });
});

describe('recordDisplay', () => {
  it('resolves known keys and rejects unknown ones', () => {
    expect(recordDisplay('pr-depth')).toBe(SESSION_RECORDS['pr-depth']);
    expect(recordDisplay('toy-time')).toBe(SESSION_RECORDS['toy-time']);
    expect(recordDisplay('pr-duration')).toBe(SESSION_RECORDS['pr-duration']);
    expect(recordDisplay('pr-future')).toBeUndefined();
  });
});
