import type { ToySection } from "../toyMachine";

/** Find the section with the largest non-null circumference. Ties go to
 *  the first in document order. Returns null when no section has a
 *  circumference set. */
export const findLargestCircumferenceSection = (
  sections: ToySection[],
): ToySection | null => {
  let widest: ToySection | null = null;
  let widestCirc = -Infinity;
  for (const s of sections) {
    if (s.circumference != null && s.circumference > widestCirc) {
      widestCirc = s.circumference;
      widest = s;
    }
  }
  return widest;
};

/** Largest non-null section circumference, or null when none is set. */
export const largestCircumference = (sections: ToySection[]): number | null => {
  let max: number | null = null;
  for (const s of sections) {
    if (s.circumference != null && (max == null || s.circumference > max)) {
      max = s.circumference;
    }
  }
  return max;
};

/** Snap a target value to the nearest candidate within `threshold`. Skips
 *  null candidates. Returns the value unchanged when nothing is near. */
export const snapToNearest = (
  value: number,
  candidates: ReadonlyArray<number | null>,
  threshold: number,
): number => {
  for (const c of candidates) {
    if (c != null && Math.abs(value - c) < threshold) return c;
  }
  return value;
};
