import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_WINDOW_DAYS,
  buildActivityHeatmap,
  colorFor,
  extent,
  formatTooltipDate,
  legendGradient,
  localDateKey,
  pluck,
} from './activity';
import { ACTIVITY_PALETTE } from './activityPalette';
import type { ActivityDay } from './types';
import { Unit } from './units';

const day = (date: string, len: number | null, circ: number | null): ActivityDay => ({
  date,
  sessionCount: 1,
  maxInsertableLength: len,
  maxCircumference: circ,
});

describe('localDateKey', () => {
  it('formats a date as YYYY-MM-DD with zero-padded fields', () => {
    expect(localDateKey(new Date(2026, 0, 3))).toBe('2026-01-03');
  });

  it('uses local calendar fields, not UTC', () => {
    // Construct a local-midnight date — exercises that the key is built
    // from getFullYear/Month/Date (local) rather than ISO (UTC).
    const d = new Date(2026, 11, 31, 0, 0, 0, 0);
    expect(localDateKey(d)).toBe('2026-12-31');
  });
});

describe('formatTooltipDate', () => {
  it('produces a human-readable string for a valid key', () => {
    const out = formatTooltipDate('2026-05-15', 'en');
    expect(out).toMatch(/2026/);
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('extent', () => {
  it('returns the min and max of a non-empty array', () => {
    expect(extent([3, 1, 7, 2])).toEqual({ min: 1, max: 7 });
  });

  it('returns {min: 0, max: 0} for an empty array', () => {
    expect(extent([])).toEqual({ min: 0, max: 0 });
  });

  it('handles a single-value array', () => {
    expect(extent([42])).toEqual({ min: 42, max: 42 });
  });
});

describe('pluck', () => {
  it('extracts non-null values via the picker', () => {
    const items = [{ v: 1 }, { v: null }, { v: 2 }, { v: undefined }];
    expect(pluck(items, (i) => i.v)).toEqual([1, 2]);
  });

  it('returns an empty array when every value is null/undefined', () => {
    expect(pluck([{ v: null }, { v: null }], (i) => i.v)).toEqual([]);
  });
});

describe('colorFor', () => {
  const HUE = ACTIVITY_PALETTE.lengthHue;

  it('returns the empty palette color when there is no session', () => {
    expect(colorFor(120, 0, 200, HUE, false)).toBe(ACTIVITY_PALETTE.empty);
  });

  it('returns the used-only color when there is a session but no value', () => {
    expect(colorFor(null, 0, 200, HUE, true)).toBe(ACTIVITY_PALETTE.usedOnly);
  });

  it('returns an HSL string for a session with a value', () => {
    const out = colorFor(150, 100, 200, HUE, true);
    expect(out.startsWith('hsl(')).toBe(true);
    expect(out).toContain(`${HUE}`);
  });

  it('maps to the deepest color when max equals min (single-value range)', () => {
    const collapsed = colorFor(100, 100, 100, HUE, true);
    const deepest = colorFor(200, 0, 200, HUE, true);
    expect(collapsed).toBe(deepest);
  });
});

describe('legendGradient', () => {
  it('returns a CSS linear-gradient anchored on the given hue', () => {
    const out = legendGradient(220);
    expect(out.startsWith('linear-gradient(to right,')).toBe(true);
    expect(out).toContain('hsl(220,');
    // 11 stops at 0%, 10%, 20%, … 100%.
    expect(out).toContain('0.0%');
    expect(out).toContain('100.0%');
  });
});

describe('buildActivityHeatmap', () => {
  const TODAY = new Date(2026, 4, 16); // 2026-05-16 local
  const sample: ActivityDay[] = [
    day('2026-05-16', 120, 100),
    day('2026-05-15', 80, 95),
    day('2026-05-10', null, null), // "used only" cell
  ];

  it('produces both length and circumference dimensions', () => {
    const out = buildActivityHeatmap(
      sample,
      Unit.mm,
      'en',
      { length: 'Length', circumference: 'Circumference' },
      { today: TODAY },
    );
    expect(out.length.title).toBe('Length');
    expect(out.circumference.title).toBe('Circumference');
  });

  it('produces exactly ACTIVITY_WINDOW_DAYS cells per dimension', () => {
    const out = buildActivityHeatmap(
      sample,
      Unit.mm,
      'en',
      { length: 'Length', circumference: 'Circumference' },
      { today: TODAY },
    );
    expect(out.length.cells).toHaveLength(ACTIVITY_WINDOW_DAYS);
    expect(out.circumference.cells).toHaveLength(ACTIVITY_WINDOW_DAYS);
  });

  it('respects a custom windowDays', () => {
    const out = buildActivityHeatmap(
      sample,
      Unit.mm,
      'en',
      { length: 'Length', circumference: 'Circumference' },
      { today: TODAY, windowDays: 30 },
    );
    expect(out.length.cells).toHaveLength(30);
  });

  it('places today as the last cell and ranges back', () => {
    const out = buildActivityHeatmap(
      sample,
      Unit.mm,
      'en',
      { length: 'Length', circumference: 'Circumference' },
      { today: TODAY, windowDays: 7 },
    );
    const dates = out.length.cells.map((c) => c.date);
    expect(dates[dates.length - 1]).toBe('2026-05-16');
    expect(dates[0]).toBe('2026-05-10');
  });

  it('colors cells with a session-and-value using HSL', () => {
    const out = buildActivityHeatmap(
      sample,
      Unit.mm,
      'en',
      { length: 'Length', circumference: 'Circumference' },
      { today: TODAY, windowDays: 7 },
    );
    const todayCell = out.length.cells.find((c) => c.date === '2026-05-16')!;
    expect(todayCell.fill.startsWith('hsl(')).toBe(true);
  });

  it('colors a session-without-value cell with the used-only palette', () => {
    const out = buildActivityHeatmap(
      sample,
      Unit.mm,
      'en',
      { length: 'Length', circumference: 'Circumference' },
      { today: TODAY, windowDays: 7 },
    );
    const usedOnly = out.length.cells.find((c) => c.date === '2026-05-10')!;
    expect(usedOnly.fill).toBe(ACTIVITY_PALETTE.usedOnly);
  });

  it('colors a cell with no session at all with the empty palette', () => {
    const out = buildActivityHeatmap(
      sample,
      Unit.mm,
      'en',
      { length: 'Length', circumference: 'Circumference' },
      { today: TODAY, windowDays: 7 },
    );
    const empty = out.length.cells.find((c) => c.date === '2026-05-13')!;
    expect(empty.fill).toBe(ACTIVITY_PALETTE.empty);
  });

  it('formats legend labels in the requested unit', () => {
    const out = buildActivityHeatmap(
      sample,
      Unit.mm,
      'en',
      { length: 'Length', circumference: 'Circumference' },
      { today: TODAY },
    );
    expect(out.length.legendMinLabel).toBe('80 mm');
    expect(out.length.legendMaxLabel).toBe('120 mm');
  });

  it('renders legend labels as em-dashes when there is no data', () => {
    const out = buildActivityHeatmap(
      [],
      Unit.mm,
      'en',
      { length: 'Length', circumference: 'Circumference' },
      { today: TODAY },
    );
    expect(out.length.legendMinLabel).toBe('—');
    expect(out.length.legendMaxLabel).toBe('—');
  });

  it('converts legend labels to the chosen unit', () => {
    const out = buildActivityHeatmap(
      sample,
      Unit.in,
      'en',
      { length: 'Length', circumference: 'Circumference' },
      { today: TODAY },
    );
    expect(out.length.legendMinLabel.endsWith(' in')).toBe(true);
    expect(out.length.legendMaxLabel.endsWith(' in')).toBe(true);
  });

  it('attaches a tooltip string to every cell', () => {
    const out = buildActivityHeatmap(
      sample,
      Unit.mm,
      'en',
      { length: 'Length', circumference: 'Circumference' },
      { today: TODAY, windowDays: 7 },
    );
    for (const cell of out.length.cells) {
      expect(cell.tooltip.length).toBeGreaterThan(0);
    }
  });
});
