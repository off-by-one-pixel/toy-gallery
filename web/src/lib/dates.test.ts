import { describe, expect, it } from 'vitest';

import {
  calendarDaysBetween,
  datetimeLocalValue,
  formatWhen,
  daysAgoDateString,
  localDateKey,
  localizedHourLabel,
  localizedWeekdayLabel,
  parseDateKey,
  startOfDay,
  startOfWeek,
} from '@/lib/dates';

describe('localDateKey', () => {
  it('formats a date as YYYY-MM-DD with zero-padded fields', () => {
    expect(localDateKey(new Date(2026, 0, 3))).toBe('2026-01-03');
  });

  it('uses local calendar fields, not UTC', () => {
    const d = new Date(2026, 11, 31, 0, 0, 0, 0);
    expect(localDateKey(d)).toBe('2026-12-31');
  });
});

describe('daysAgoDateString', () => {
  it('formats local calendar days shifted back', () => {
    expect(daysAgoDateString(1, new Date(2026, 5, 8, 12, 0))).toBe('2026-06-07');
    expect(daysAgoDateString(0, new Date(2026, 0, 2, 0, 30))).toBe('2026-01-02');
  });
});

describe('startOfDay', () => {
  it('zeroes the time while keeping the local calendar day', () => {
    const start = startOfDay(new Date(2026, 5, 8, 23, 45));
    expect(localDateKey(start)).toBe('2026-06-08');
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });
});

describe('startOfWeek', () => {
  it('moves to the local midnight of the Monday on or before the date', () => {
    const start = startOfWeek(new Date(2026, 5, 21, 23, 45));
    expect(localDateKey(start)).toBe('2026-06-15');
    expect(start.getHours()).toBe(0);
    expect(localDateKey(startOfWeek(new Date(2026, 5, 15, 8)))).toBe('2026-06-15');
  });

  it('crosses month boundaries', () => {
    expect(localDateKey(startOfWeek(new Date(2026, 6, 1)))).toBe('2026-06-29');
  });
});

describe('parseDateKey', () => {
  it('parses a date key as local midnight', () => {
    expect(parseDateKey('2026-06-15')).toEqual(new Date(2026, 5, 15));
  });

  it('defaults a month key to its first day', () => {
    expect(parseDateKey('2026-06')).toEqual(new Date(2026, 5, 1));
  });
});

describe('datetimeLocalValue', () => {
  it('formats a local datetime-local input value', () => {
    expect(datetimeLocalValue(new Date(2026, 5, 8, 7, 5))).toBe('2026-06-08T07:05');
  });
});

describe('localized bucket labels', () => {
  it('formats hours and Monday-first weekdays for a locale', () => {
    expect(localizedHourLabel(13, 'en')).toMatch(/1/);
    expect(localizedWeekdayLabel(0, 'en')).toBe('Mon');
    expect(localizedWeekdayLabel(6, 'en')).toBe('Sun');
  });
});

describe('calendarDaysBetween', () => {
  it('counts whole local calendar days regardless of time of day', () => {
    expect(calendarDaysBetween(new Date(2026, 5, 7, 23, 59), new Date(2026, 5, 8, 0, 1))).toBe(1);
    expect(calendarDaysBetween(new Date(2026, 5, 8, 0, 1), new Date(2026, 5, 8, 23, 59))).toBe(0);
    expect(calendarDaysBetween(new Date(2026, 5, 10), new Date(2026, 5, 8))).toBe(-2);
  });
});

const NOW = new Date(2026, 4, 16, 10, 0);

const whenT = (key: 'today' | 'yesterday') => (key === 'today' ? 'Today' : 'Yesterday');

describe('formatWhen', () => {
  it("formats today's timestamp with a Today prefix", () => {
    expect(formatWhen('2026-05-16T09:30:00', NOW, 'en', whenT)).toMatch(/^Today · /);
  });

  it("formats yesterday's timestamp with a Yesterday prefix", () => {
    expect(formatWhen('2026-05-15T20:00:00', NOW, 'en', whenT)).toMatch(/^Yesterday · /);
  });

  it('formats older timestamps as month + day', () => {
    const out = formatWhen('2026-04-01T14:00:00', NOW, 'en', whenT);
    expect(out).not.toMatch(/Today|Yesterday/);
    expect(out).toContain('Apr');
  });
});
