import type { Unit } from "../components/unit";

/** Format a canonical mm value as a unit-suffixed display string,
 *  e.g. `42.5 mm` or `4.25 cm`. Returns `null` formatted as the empty
 *  string. */
export const fmtUnit = (mm: number, unit: Unit): string =>
  `${(mm / unit.factor).toFixed(unit.decimals)} ${unit.id}`;

/** Format a canonical mm value as a bare number in the display unit
 *  (no unit suffix). Useful for tick labels where the unit is shown
 *  separately. */
export const fmtUnitNum = (mm: number, unit: Unit): string =>
  (mm / unit.factor).toFixed(unit.decimals);

/** Format a canonical mm value (or null) for an `<input>` `value` —
 *  empty string for null, otherwise the bare display number. */
export const formatMm = (mm: number | null | undefined, unit: Unit): string =>
  mm == null ? "" : (mm / unit.factor).toFixed(unit.decimals);

/** Parse a raw `<input>` value into canonical mm. Returns:
 *  - `null` if the input is empty (i.e., the user cleared it)
 *  - `undefined` if the input is non-numeric (caller should ignore)
 *  - a non-negative mm value otherwise */
export const parseMm = (raw: string, unit: Unit): number | null | undefined => {
  if (raw === "") return null;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) return undefined;
  return Math.max(0, parsed) * unit.factor;
};
