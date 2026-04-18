export type Unit = 'mm' | 'in';

export type Dimension = { mm: number; in: number };

export const INCH_MM = 25.4;

export const toMm = (value: number, unit: Unit): number =>
  unit === 'in' ? value * INCH_MM : value;

export const fromMm = (mm: number, unit: Unit): number =>
  unit === 'in' ? mm / INCH_MM : mm;

export const formatDim = (d: Dimension | null, unit: Unit): string => {
  if (!d) return '—';
  const v = d[unit];
  return unit === 'in' ? v.toFixed(2) : String(Math.round(v));
};

export const formatValue = (mm: number | null | undefined, unit: Unit): string => {
  if (mm == null) return '—';
  const v = fromMm(mm, unit);
  return unit === 'in' ? v.toFixed(2) : String(Math.round(v));
};
