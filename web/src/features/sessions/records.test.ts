import { describe, expect, it } from 'vitest';

import type { SessionRecord, ToyRecord } from '@/api/types';
import {
  latestToyRecords,
  recordDisplay,
  SESSION_RECORDS,
  sessionRecordItems,
  toyRecordItems,
  type RecordDisplayContext,
} from '@/features/sessions/records';
import { makeToy } from '@/test/fixtures';
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
    expect(SESSION_RECORDS['pr-duration'].value(120, ctx())).toEqual({ text: '2h' });
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

describe('latestToyRecords', () => {
  it('keeps the first row per key in server order', () => {
    const rows: ToyRecord[] = [
      { key: 'toy-level', value: 2, achievedAt: '2026-06-03T10:00:00Z' },
      { key: 'toy-level', value: 1, achievedAt: '2026-06-01T10:00:00Z' },
      { key: 'toy-time', value: 90, achievedAt: '2026-06-02T10:00:00Z' },
      { key: 'toy-time', value: 30, achievedAt: '2026-06-01T10:00:00Z' },
    ];
    expect(latestToyRecords(rows).map((r) => [r.key, r.value])).toEqual([
      ['toy-level', 2],
      ['toy-time', 90],
    ]);
  });
});

describe('sessionRecordItems', () => {
  const record = (key: string, value: number, toy: number | null): SessionRecord =>
    ({ key, toy, value, achievedAt: '2026-06-01T21:00:00' }) as SessionRecord;
  const toys = new Map([[1, makeToy({ id: 1, brand: 'Acme', name: 'Steel', size: 'M' })]]);

  it('notes the toy a record belongs to', () => {
    expect(sessionRecordItems([record('pr-width', 240, 1)], toys)).toEqual([
      { id: 'pr-width-1', key: 'pr-width', value: 240, note: 'Acme Steel M' },
    ]);
  });

  it('leaves session-wide records and records of unloaded toys without a note', () => {
    const items = sessionRecordItems([record('pr-time', 45, null), record('pr-width', 240, 99)], toys);
    expect(items.map((item) => item.note)).toEqual([undefined, undefined]);
  });

  it('keeps one item per toy for the same record key', () => {
    const items = sessionRecordItems([record('toy-time', 30, 1), record('toy-time', 90, 2)], toys);
    expect(new Set(items.map((item) => item.id)).size).toBe(2);
  });
});

describe('toyRecordItems', () => {
  it('keeps the latest record per key and notes the day it was achieved', () => {
    const items = toyRecordItems(
      [
        { key: 'toy-time', value: 90, achievedAt: '2026-06-02T10:00:00Z' },
        { key: 'toy-time', value: 30, achievedAt: '2026-06-01T10:00:00Z' },
      ],
      'en',
    );
    expect(items).toEqual([{ id: 'toy-time', key: 'toy-time', value: 90, note: expect.stringMatching(/Jun 2, 2026/) }]);
  });
});
