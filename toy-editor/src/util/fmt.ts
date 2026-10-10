import type { Unit } from "../components/unit";

export const fmtUnit = (mm: number, unit: Unit): string =>
  `${(mm / unit.factor).toFixed(unit.decimals)} ${unit.id}`;

export const fmtUnitNum = (mm: number, unit: Unit): string =>
  (mm / unit.factor).toFixed(unit.decimals);

export const formatMm = (mm: number | null | undefined, unit: Unit): string =>
  mm == null ? "" : (mm / unit.factor).toFixed(unit.decimals);

export const parseMm = (raw: string, unit: Unit): number | null | undefined => {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) return undefined;
  return Math.max(0, parsed) * unit.factor;
};
