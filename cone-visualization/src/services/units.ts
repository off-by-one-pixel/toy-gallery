import type { ToySection } from 'cone-editor';

export const Unit = {
  mm: { id: 'mm', factor: 1, decimals: 0 },
  cm: { id: 'cm', factor: 10, decimals: 1 },
  in: { id: 'in', factor: 25.4, decimals: 2 },
} as const;
export type Unit = (typeof Unit)[keyof typeof Unit];

export const defaultUnit: Unit = Object.values(Unit)[0];

export type Dimension = { mm: number; in: number };

export const toMm = (value: number, unit: Unit): number => value * unit.factor;

export const fromMm = (mm: number, unit: Unit): number => mm / unit.factor;

export const convertSections = (sections: ToySection[], from: Unit, to: Unit): ToySection[] => {
  if (from === to) return sections;
  return sections.map((s) => ({
    ...s,
    diameter: fromMm(toMm(s.diameter, from), to),
    height: fromMm(toMm(s.height, from), to),
    circumference: s.circumference == null ? s.circumference : fromMm(toMm(s.circumference, from), to),
  }));
};

export const formatValue = (mm: number | null | undefined, unit: Unit): string => {
  if (mm == null) return '—';
  return fromMm(mm, unit).toFixed(unit.decimals);
};

export const formatDim = (d: Dimension | null, unit: Unit): string => formatValue(d?.mm ?? null, unit);

export const unitById = (id: string): Unit | undefined => Object.values(Unit).find((u) => u.id === id);
