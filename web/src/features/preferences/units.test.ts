import { describe, expect, it } from 'vitest';

import type { ToySection } from 'toy-editor';

import {
  Unit,
  convertSections,
  formatForInput,
  formatValue,
  fromMm,
  parseInput,
  parseToMm,
  toMm,
} from '@/features/preferences/units';

describe('toMm / fromMm', () => {
  it('passes mm through unchanged', () => {
    expect(toMm(100, Unit.mm)).toBe(100);
    expect(fromMm(100, Unit.mm)).toBe(100);
  });

  it('converts inches to mm and back', () => {
    expect(toMm(10, Unit.in)).toBeCloseTo(254);
    expect(fromMm(254, Unit.in)).toBeCloseTo(10);
  });

  it('has the correct inch conversion factor', () => {
    expect(Unit.in.factor).toBe(25.4);
  });

  it('round-trips a non-trivial value', () => {
    const mm = 170;
    expect(toMm(fromMm(mm, Unit.in), Unit.in)).toBeCloseTo(mm);
  });
});

describe('formatValue', () => {
  it.each<[number | null | undefined, keyof typeof Unit, string]>([
    [null, 'mm', '—'],
    [undefined, 'in', '—'],
    [169.4, 'mm', '169'],
    [254, 'in', '10.00'],
  ])('formats %j %s as %j', (value, unit, expected) => {
    expect(formatValue(value, Unit[unit])).toBe(expected);
  });
});

describe('convertSections', () => {
  const sections: ToySection[] = [
    { id: 0, diameter: 100, height: 50, circumference: 220 },
    { id: 1, diameter: 80, height: 40, circumference: null },
  ];

  it('returns the same array reference when units match', () => {
    expect(convertSections(sections, Unit.mm, Unit.mm)).toBe(sections);
  });

  it('converts mm to inches on every numeric field', () => {
    const out = convertSections(sections, Unit.mm, Unit.in);
    expect(out[0].diameter).toBeCloseTo(100 / 25.4);
    expect(out[0].height).toBeCloseTo(50 / 25.4);
    expect(out[0].circumference).toBeCloseTo(220 / 25.4);
  });

  it('preserves null circumference', () => {
    const out = convertSections(sections, Unit.mm, Unit.in);
    expect(out[1].circumference).toBeNull();
  });

  it('does not mutate the input', () => {
    const before = structuredClone(sections);
    convertSections(sections, Unit.mm, Unit.in);
    expect(sections).toEqual(before);
  });

  it('round-trips mm → in → mm', () => {
    const round = convertSections(convertSections(sections, Unit.mm, Unit.in), Unit.in, Unit.mm);
    expect(round[0].diameter).toBeCloseTo(sections[0].diameter);
    expect(round[0].height).toBeCloseTo(sections[0].height);
    expect(round[0].circumference).toBeCloseTo(sections[0].circumference!);
  });
});

describe('formatForInput', () => {
  it('rounds to the unit precision', () => {
    expect(formatForInput(120, Unit.mm)).toBe('120');
    expect(formatForInput(120, Unit.cm)).toBe('12.0');
  });
});

describe('parseInput', () => {
  it.each<[string, number | null]>([
    ['42', 42],
    ['40,5', 40.5],
    ['   ', null],
    ['0', null],
    ['-5', null],
    ['abc', null],
  ])('parses %j as %j', (raw, expected) => {
    expect(parseInput(raw)).toBe(expected);
  });
});

describe('parseToMm', () => {
  it('converts an inch input to mm', () => {
    expect(parseToMm('1', Unit.in)).toBeCloseTo(25.4);
  });

  it('returns null for invalid input', () => {
    expect(parseToMm('', Unit.mm)).toBeNull();
  });
});
