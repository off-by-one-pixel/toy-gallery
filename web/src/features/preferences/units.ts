import type { ToySection } from 'toy-editor';

export const Unit = {
  mm: { id: 'mm', factor: 1, decimals: 0 },
  cm: { id: 'cm', factor: 10, decimals: 1 },
  in: { id: 'in', factor: 25.4, decimals: 2 },
} as const;
export type Unit = (typeof Unit)[keyof typeof Unit];

export const defaultUnit: Unit = Object.values(Unit)[0];

export const toMm = (value: number, unit: Unit): number => value * unit.factor;

export const fromMm = (mm: number, unit: Unit): number => mm / unit.factor;

/** Convert a circumference to a diameter assuming a circular cross-section
 *  (d = c / π). Pass-through for null. */
export const circumferenceToDiameter = (circumference: number | null | undefined): number | null =>
  circumference == null ? null : circumference / Math.PI;

/** Convert a diameter to a circumference assuming a circular cross-section
 *  (c = π · d). Pass-through for null. */
export const diameterToCircumference = (diameter: number | null | undefined): number | null =>
  diameter == null ? null : diameter * Math.PI;

export const convertSections = (sections: ToySection[], from: Unit, to: Unit): ToySection[] => {
  if (from === to) return sections;
  return sections.map((s) => ({
    ...s,
    diameter: fromMm(toMm(s.diameter, from), to),
    height: fromMm(toMm(s.height, from), to),
    circumference: s.circumference == null ? s.circumference : fromMm(toMm(s.circumference, from), to),
  }));
};

export const formatForInput = (mm: number, unit: Unit): string => fromMm(mm, unit).toFixed(unit.decimals);

export const parseInput = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const v = Number(trimmed.replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? v : null;
};

export const parseToMm = (raw: string, unit: Unit): number | null => {
  const v = parseInput(raw);
  return v == null ? null : toMm(v, unit);
};

export const formatValue = (mm: number | null | undefined, unit: Unit): string => {
  if (mm == null) return '—';
  return fromMm(mm, unit).toFixed(unit.decimals);
};

export const unitById = (id: string): Unit | undefined => Object.values(Unit).find((u) => u.id === id);
