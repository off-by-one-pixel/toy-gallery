import type { ToySection } from 'cone-editor';

export const Unit = {
  mm: 'mm',
  in: 'in',
} as const;
export type Unit = (typeof Unit)[keyof typeof Unit];

export type Dimension = { mm: number; in: number };

export const INCH_MM = 25.4;

export const toMm = (value: number, unit: Unit): number =>
  unit === Unit.in ? value * INCH_MM : value;

export const fromMm = (mm: number, unit: Unit): number =>
  unit === Unit.in ? mm / INCH_MM : mm;

/**
 * Convert a list of editor sections from one display unit to another.
 * Numeric fields (diameter, height, circumference) are scaled; everything
 * else is passed through.
 */
export const convertSections = (
  sections: ToySection[],
  from: Unit,
  to: Unit,
): ToySection[] => {
  if (from === to) return sections;
  return sections.map((s) => ({
    ...s,
    diameter: fromMm(toMm(s.diameter, from), to),
    height: fromMm(toMm(s.height, from), to),
    circumference:
      s.circumference == null ? s.circumference : fromMm(toMm(s.circumference, from), to),
  }));
};

export const formatDim = (d: Dimension | null, unit: Unit): string => {
  if (!d) return '—';
  const v = d[unit];
  return unit === Unit.in ? v.toFixed(2) : String(Math.round(v));
};

export const formatValue = (mm: number | null | undefined, unit: Unit): string => {
  if (mm == null) return '—';
  const v = fromMm(mm, unit);
  return unit === Unit.in ? v.toFixed(2) : String(Math.round(v));
};
