import { describe, expect, it } from 'vitest';

import { formatDateKey, localDateKey, MS_PER_DAY } from '@/lib/dates';
import { ACTIVITY_PALETTE } from '@/features/sessions/stats/activityPalette';
import {
  METRIC_COUNT,
  METRIC_MAX_CIRCUMFERENCE,
  METRIC_MAX_LENGTH,
  METRIC_TOTAL_DURATION,
  METRIC_TOTAL_SESSION_DURATION,
  SESSION_STATS,
} from '@/features/sessions/stats/statsConfig';
import {
  buildCalendarView,
  buildFrequencyView,
  buildStatViews,
  buildWeeklyView,
  type CalendarStatDef,
  deriveQueries,
  type FrequencyStatDef,
  type StatContext,
  rangeFor,
  type WeeklyStatDef,
} from '@/features/sessions/stats/statsView';
import type { StatsGroup } from '@/api/types';
import en from '@/i18n/catalogs/en.json';
import { enTranslator } from '@/test/translator';

const MM: StatContext['unit'] = { id: 'mm', factor: 1, decimals: 0 };
const INCHES: StatContext['unit'] = { id: 'in', factor: 25.4, decimals: 2 };

const ctx = (overrides: Partial<StatContext> = {}): StatContext => ({
  unit: MM,
  girth: 'circumference',
  locale: 'en',
  t: enTranslator,
  ...overrides,
});

const lengthDef: CalendarStatDef = {
  kind: 'calendar',
  key: 'length',
  metric: METRIC_MAX_LENGTH,
  hue: ACTIVITY_PALETTE.lengthHue,
  title: (c) => c.t('common.length'),
};

const hourDef: FrequencyStatDef = {
  kind: 'hour',
  key: 'hour',
  metric: METRIC_COUNT,
  hue: ACTIVITY_PALETTE.timeOfDayHue,
  gamma: ACTIVITY_PALETTE.sessionsGamma,
  minPolicy: 'zero',
  title: () => 'Time of day',
  empty: () => 'empty',
  bucketLabel: (hour) => hour,
  tooltip: (hour, count) => `${hour}:${count}`,
};

const weekdayDef: FrequencyStatDef = {
  ...hourDef,
  kind: 'weekday',
  key: 'weekday',
  hue: ACTIVITY_PALETTE.weekdayHue,
  minPolicy: 'nonzeroMin',
};

const group = (key: string, values: Record<string, number | null>): StatsGroup => ({ key, values });

const TODAY = new Date(2026, 5, 15);

const calendar = (
  def: CalendarStatDef,
  groups: StatsGroup[] = [],
  { windowDays = 2, ...context }: Partial<StatContext> & { windowDays?: number } = {},
) => buildCalendarView(def, groups, ctx(context), { today: TODAY, windowDays });

describe('buildCalendarView', () => {
  it('produces exactly windowDays cells ending today', () => {
    const view = calendar(lengthDef, [], { windowDays: 10 });
    expect(view.cells).toHaveLength(10);
    expect(view.cells[9].date).toBe(localDateKey(TODAY));
    expect(view.endDate.getTime()).toBeGreaterThan(view.startDate.getTime());
  });

  it('colors valued days with hsl, valueless days as used-only, absent days as empty', () => {
    const key = localDateKey(TODAY);
    const view = calendar(
      lengthDef,
      [group(key, { [METRIC_MAX_LENGTH]: 170 }), group('2026-06-14', { [METRIC_MAX_LENGTH]: null })],
      { windowDays: 3 },
    );
    expect(view.cells[2].fill.startsWith('hsl(')).toBe(true);
    expect(view.cells[1].fill).toBe(ACTIVITY_PALETTE.usedOnly);
    expect(view.cells[0].fill).toBe(ACTIVITY_PALETTE.empty);
  });

  it('formats the time-per-day legend as a localized duration', () => {
    const def = SESSION_STATS.find((candidate): candidate is CalendarStatDef => candidate.key === 'time-per-day');
    expect(def).toBeDefined();
    if (!def) return;
    const groups = [group(localDateKey(TODAY), { [METRIC_TOTAL_DURATION]: 95 })];
    const view = calendar(def, groups);
    expect(view.legendMaxLabel).toBe('1h 35m');
  });

  it('sums the window into the header total for time-per-day', () => {
    const def = SESSION_STATS.find((candidate): candidate is CalendarStatDef => candidate.key === 'time-per-day');
    if (!def) return;
    const yesterday = localDateKey(new Date(TODAY.getTime() - MS_PER_DAY));
    const groups = [
      group(localDateKey(TODAY), { [METRIC_TOTAL_DURATION]: 95 }),
      group(yesterday, { [METRIC_TOTAL_DURATION]: 30 }),
    ];
    const view = calendar(def, groups);
    expect(view.summary).toBe('2h 5m');
  });

  it('keeps the header total empty without a summary or data', () => {
    const view = calendar(lengthDef);
    expect(view.summary).toBeNull();
  });

  it('formats legend labels in the requested unit', () => {
    const groups = [group(localDateKey(TODAY), { [METRIC_MAX_LENGTH]: 127 })];
    expect(calendar(lengthDef, groups).legendMaxLabel).toBe('127 mm');
    expect(calendar(lengthDef, groups, { unit: INCHES }).legendMaxLabel).toBe('5.00 in');
  });

  it('renders em-dash legend labels when there is no data', () => {
    const view = calendar(lengthDef);
    expect(view.legendMinLabel).toBe('—');
    expect(view.legendMaxLabel).toBe('—');
  });

  it('applies a custom legend formatter', () => {
    const def: CalendarStatDef = { ...lengthDef, metric: METRIC_COUNT, formatLegend: (v) => `${Math.round(v)}` };
    const view = calendar(def, [group(localDateKey(TODAY), { [METRIC_COUNT]: 3 })]);
    expect(view.legendMaxLabel).toBe('3');
  });

  it('applies the value transform to fills and legend', () => {
    const def: CalendarStatDef = {
      ...lengthDef,
      metric: METRIC_MAX_CIRCUMFERENCE,
      value: (raw) => (raw == null ? null : raw / 2),
    };
    const view = calendar(def, [group(localDateKey(TODAY), { [METRIC_MAX_CIRCUMFERENCE]: 200 })]);
    expect(view.legendMaxLabel).toBe('100 mm');
  });

  it('resolves the title from context', () => {
    const view = calendar(lengthDef);
    expect(view.title).toBe(en.common.length);
  });

  it('attaches a tooltip to every cell', () => {
    const view = calendar(lengthDef, [], { windowDays: 5 });
    for (const cell of view.cells) expect(cell.tooltip.length).toBeGreaterThan(0);
  });
});

describe('buildFrequencyView', () => {
  it('always produces size cells, filling gaps with zero', () => {
    const view = buildFrequencyView(hourDef, [group('2', { count: 3 }), group('10', { count: 1 })], ctx());
    expect(view.cells).toHaveLength(24);
    expect(view.cells[2].fill.startsWith('hsl(')).toBe(true);
    expect(view.cells[0].fill).toBe(ACTIVITY_PALETTE.empty);
    expect(view.total).toBe(4);
    expect(view.max).toBe(3);
  });

  it('ignores out-of-range and non-numeric keys', () => {
    const view = buildFrequencyView(
      weekdayDef,
      [group('2026-06-01', { count: 9 }), group('-1', { count: 9 }), group('9', { count: 9 })],
      ctx(),
    );
    expect(view.total).toBe(0);
  });

  it('uses zero legend minimum for the zero policy', () => {
    const view = buildFrequencyView(hourDef, [group('5', { count: 4 })], ctx());
    expect(view.legendMin).toBe(0);
  });

  it('uses the smallest non-zero bucket for the nonzeroMin policy', () => {
    const view = buildFrequencyView(weekdayDef, [group('0', { count: 4 }), group('6', { count: 1 })], ctx());
    expect(view.legendMin).toBe(1);
    expect(view.cells[6].fill).not.toBe(ACTIVITY_PALETTE.empty);
  });

  it('reports zero legend minimum when empty', () => {
    expect(buildFrequencyView(weekdayDef, [], ctx()).legendMin).toBe(0);
  });

  it('builds labels and tooltips from the definition', () => {
    const view = buildFrequencyView(hourDef, [group('7', { count: 2 })], ctx());
    expect(view.cells[7].label).toBe(7);
    expect(view.cells[7].tooltip).toBe('7:2');
  });
});

const weeklyDef: WeeklyStatDef = {
  kind: 'weekly',
  key: 'weekly',
  metric: METRIC_TOTAL_SESSION_DURATION,
  hue: ACTIVITY_PALETTE.sessionTimeHue,
  title: () => 'Weekly',
  empty: () => 'empty',
  format: (value) => `${value}m`,
  tooltip: (week, value) => `${week}|${value}`,
};

const WEDNESDAY = new Date(2026, 5, 17);

const weekly = (def: WeeklyStatDef, groups: StatsGroup[] = []) =>
  buildWeeklyView(def, groups, ctx(), { today: WEDNESDAY, windowDays: 14 });

describe('buildWeeklyView', () => {
  it('spans Monday-start weeks from the window start through the current week', () => {
    expect(weekly(weeklyDef).bars.map((bar) => bar.week)).toEqual(['2026-06-01', '2026-06-08', '2026-06-15']);
  });

  it('covers the default activity window with 53 weeks', () => {
    expect(buildWeeklyView(weeklyDef, [], ctx(), { today: WEDNESDAY }).bars).toHaveLength(53);
  });

  it('sums daily values into their week and scales bars to the busiest week', () => {
    const view = weekly(weeklyDef, [
      group('2026-06-07', { [METRIC_TOTAL_SESSION_DURATION]: 30 }),
      group('2026-06-08', { [METRIC_TOTAL_SESSION_DURATION]: 60 }),
      group('2026-06-10', { [METRIC_TOTAL_SESSION_DURATION]: 60 }),
      group('2026-06-16', { [METRIC_TOTAL_SESSION_DURATION]: null }),
    ]);
    expect(view.bars.map((bar) => bar.height)).toEqual([25, 100, 0]);
    expect(view.total).toBe(150);
    expect(view.summary).toBe('150m');
    expect(view.maxLabel).toBe('120m');
  });

  it('labels the axis and tooltips with week starts', () => {
    const view = weekly(weeklyDef, [group('2026-06-09', { [METRIC_TOTAL_SESSION_DURATION]: 45 })]);
    expect(view.startLabel).toBe(formatDateKey('2026-06-01', 'en'));
    expect(view.endLabel).toBe(formatDateKey('2026-06-15', 'en'));
    expect(view.bars[1].tooltip).toBe(`${formatDateKey('2026-06-08', 'en')}|45m`);
  });

  it('has no summary and flat bars without data', () => {
    const view = weekly(weeklyDef);
    expect(view.summary).toBeNull();
    expect(view.total).toBe(0);
    expect(view.emptyLabel).toBe('empty');
    expect(view.bars.every((bar) => bar.height === 0)).toBe(true);
  });

  it('formats the session-time config as localized durations', () => {
    const def = SESSION_STATS.find((candidate): candidate is WeeklyStatDef => candidate.key === 'session-time');
    expect(def).toBeDefined();
    if (!def) return;
    const view = weekly(def, [group('2026-06-16', { [METRIC_TOTAL_SESSION_DURATION]: 95 })]);
    expect(view.summary).toBe('1h 35m');
    expect(view.bars[2].tooltip).toBe(`Week of ${formatDateKey('2026-06-15', 'en')} · 1h 35m`);
  });
});

describe('buildStatViews', () => {
  it('feeds calendar and weekly stats from the shared date results', () => {
    const groups = [group(localDateKey(new Date()), { [METRIC_MAX_LENGTH]: 170, [METRIC_TOTAL_SESSION_DURATION]: 30 })];
    const items = buildStatViews([lengthDef, weeklyDef], new Map([['date', groups]]), ctx());
    expect(items.map((item) => item.kind)).toEqual(['calendar', 'weekly']);
    const weeklyItem = items[1];
    expect(weeklyItem.kind === 'weekly' && weeklyItem.view.total).toBe(30);
  });
});

describe('deriveQueries', () => {
  it('batches the default config into three queries with deduped metrics', () => {
    const queries = deriveQueries(SESSION_STATS);
    expect(queries.map((q) => [q.groupBy, q.window])).toEqual([
      ['date', 'year'],
      ['hour', 'filter'],
      ['weekday', 'filter'],
    ]);
    expect(queries[0].metrics).toEqual([
      METRIC_MAX_LENGTH,
      METRIC_MAX_CIRCUMFERENCE,
      METRIC_COUNT,
      METRIC_TOTAL_DURATION,
      METRIC_TOTAL_SESSION_DURATION,
    ]);
    expect(queries[1].metrics).toEqual([METRIC_COUNT]);
  });

  it('dedupes repeated metrics within a group', () => {
    const queries = deriveQueries([lengthDef, { ...lengthDef, key: 'other' }]);
    expect(queries).toHaveLength(1);
    expect(queries[0].metrics).toEqual([METRIC_MAX_LENGTH]);
  });
});

describe('rangeFor', () => {
  it('defaults year windows to the activity window and bounds every window by the period', () => {
    expect(rangeFor('year', { kind: 'all' }).start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(rangeFor('year', { kind: 'all' }).end).toBeUndefined();
    expect(rangeFor('filter', { kind: 'all' })).toEqual({});
    const week = { start: '2026-06-08', end: '2026-06-14' };
    expect(rangeFor('year', { kind: 'week', anchor: '2026-06-08' })).toEqual(week);
    expect(rangeFor('filter', { kind: 'week', anchor: '2026-06-08' })).toEqual(week);
  });
});
