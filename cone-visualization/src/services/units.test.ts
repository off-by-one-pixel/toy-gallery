import { describe, expect, it } from 'vitest';

import type { ToySection } from 'toy-editor';

import { Unit, convertSections, formatValue, fromMm, toMm } from './units';

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
  it('returns an em-dash for null / undefined', () => {
    expect(formatValue(null, Unit.mm)).toBe('—');
    expect(formatValue(undefined, Unit.in)).toBe('—');
  });

  it('rounds to an integer in mm', () => {
    expect(formatValue(169.4, Unit.mm)).toBe('169');
  });

  it('converts and rounds to two decimals in inches', () => {
    expect(formatValue(254, Unit.in)).toBe('10.00');
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
