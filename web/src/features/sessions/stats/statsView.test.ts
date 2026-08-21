import { describe, expect, it } from 'vitest';

import { localDateKey } from '@/lib/dates';
import { ACTIVITY_PALETTE } from '@/features/sessions/stats/activityPalette';
import {
  METRIC_COUNT,
  METRIC_MAX_CIRCUMFERENCE,
  METRIC_MAX_LENGTH,
  SESSION_STATS,
} from '@/features/sessions/stats/statsConfig';
import {
  buildCalendarView,
  buildFrequencyView,
  type CalendarStatDef,
  deriveQueries,
  type FrequencyStatDef,
  type StatContext,
  startFor,
} from '@/features/sessions/stats/statsView';
import type { StatsGroup } from '@/api/types';

const MM: StatContext['unit'] = { id: 'mm', factor: 1, decimals: 0 };
const INCHES: StatContext['unit'] = { id: 'in', factor: 25.4, decimals: 2 };

const ctx = (overrides: Partial<StatContext> = {}): StatContext => ({
  unit: MM,
  girth: 'circumference',
  locale: 'en',
  t: (key) => key,
  ...overrides,
});

const lengthDef: CalendarStatDef = {
  kind: 'calendar',
  key: 'length',
  groupBy: 'date',
  window: 'year',
  metric: METRIC_MAX_LENGTH,
  hue: ACTIVITY_PALETTE.lengthHue,
  title: (c) => c.t('common.length'),
};

const hourDef: FrequencyStatDef = {
  kind: 'frequency',
  key: 'hour',
  groupBy: 'hour',
  window: 'filter',
  metric: METRIC_COUNT,
  size: 24,
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
  key: 'weekday',
  groupBy: 'weekday',
  size: 7,
  hue: ACTIVITY_PALETTE.weekdayHue,
  minPolicy: 'nonzeroMin',
};

const group = (key: string, values: Record<string, number | null>): StatsGroup => ({ key, values });

const TODAY = new Date(2026, 5, 15);

describe('buildCalendarView', () => {
  it('produces exactly windowDays cells ending today', () => {
    const view = buildCalendarView(lengthDef, [], ctx(), { today: TODAY, windowDays: 10 });
    expect(view.cells).toHaveLength(10);
    expect(view.cells[9].date).toBe(localDateKey(TODAY));
    expect(view.endDate.getTime()).toBeGreaterThan(view.startDate.getTime());
  });

  it('colors valued days with hsl, valueless days as used-only, absent days as empty', () => {
    const key = localDateKey(TODAY);
    const view = buildCalendarView(
      lengthDef,
      [group(key, { [METRIC_MAX_LENGTH]: 170 }), group('2026-06-14', { [METRIC_MAX_LENGTH]: null })],
      ctx(),
      { today: TODAY, windowDays: 3 },
    );
    expect(view.cells[2].fill.startsWith('hsl(')).toBe(true);
    expect(view.cells[1].fill).toBe(ACTIVITY_PALETTE.usedOnly);
    expect(view.cells[0].fill).toBe(ACTIVITY_PALETTE.empty);
  });

  it('formats legend labels in the requested unit', () => {
    const groups = [group(localDateKey(TODAY), { [METRIC_MAX_LENGTH]: 127 })];
    const mm = buildCalendarView(lengthDef, groups, ctx(), { today: TODAY, windowDays: 2 });
    expect(mm.legendMaxLabel).toBe('127 mm');
    const inches = buildCalendarView(lengthDef, groups, ctx({ unit: INCHES }), {
      today: TODAY,
      windowDays: 2,
    });
    expect(inches.legendMaxLabel).toBe('5.00 in');
  });

  it('renders em-dash legend labels when there is no data', () => {
    const view = buildCalendarView(lengthDef, [], ctx(), { today: TODAY, windowDays: 2 });
    expect(view.legendMinLabel).toBe('—');
    expect(view.legendMaxLabel).toBe('—');
  });

  it('applies a custom legend formatter', () => {
    const def: CalendarStatDef = { ...lengthDef, metric: METRIC_COUNT, formatLegend: (v) => `${Math.round(v)}` };
    const view = buildCalendarView(def, [group(localDateKey(TODAY), { [METRIC_COUNT]: 3 })], ctx(), {
      today: TODAY,
      windowDays: 2,
    });
    expect(view.legendMaxLabel).toBe('3');
  });

  it('applies the value transform to fills and legend', () => {
    const def: CalendarStatDef = {
      ...lengthDef,
      metric: METRIC_MAX_CIRCUMFERENCE,
      value: (raw) => (raw == null ? null : raw / 2),
    };
    const view = buildCalendarView(def, [group(localDateKey(TODAY), { [METRIC_MAX_CIRCUMFERENCE]: 200 })], ctx(), {
      today: TODAY,
      windowDays: 2,
    });
    expect(view.legendMaxLabel).toBe('100 mm');
  });

  it('resolves the title from context', () => {
    const view = buildCalendarView(lengthDef, [], ctx(), { today: TODAY, windowDays: 2 });
    expect(view.title).toBe('common.length');
  });

  it('attaches a tooltip to every cell', () => {
    const view = buildCalendarView(lengthDef, [], ctx(), { today: TODAY, windowDays: 5 });
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

describe('deriveQueries', () => {
  it('batches the default config into three queries with deduped metrics', () => {
    const queries = deriveQueries(SESSION_STATS);
    expect(queries.map((q) => q.key)).toEqual(['date:year', 'hour:filter', 'weekday:filter']);
    expect(queries[0].metrics).toEqual([METRIC_MAX_LENGTH, METRIC_MAX_CIRCUMFERENCE, METRIC_COUNT]);
    expect(queries[1].metrics).toEqual([METRIC_COUNT]);
  });

  it('dedupes repeated metrics within a group', () => {
    const queries = deriveQueries([lengthDef, { ...lengthDef, key: 'other' }]);
    expect(queries).toHaveLength(1);
    expect(queries[0].metrics).toEqual([METRIC_MAX_LENGTH]);
  });
});

describe('startFor', () => {
  it('maps year windows to the activity window start and filter windows to the filter', () => {
    expect(startFor('year', 'all')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(startFor('filter', 'all')).toBeUndefined();
    expect(startFor('filter', 'week')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('SESSION_STATS config', () => {
  it('has unique keys and resolvable titles', () => {
    const keys = SESSION_STATS.map((def) => def.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const def of SESSION_STATS) expect(def.title(ctx()).length).toBeGreaterThan(0);
  });
});
