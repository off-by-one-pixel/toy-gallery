/** Convert a circumference to a diameter assuming a circular cross-section
 *  (d = c / π). Pass-through for null. */
export const circumferenceToDiameter = (
  circumference: number | null | undefined,
): number | null => (circumference == null ? null : circumference / Math.PI);

/** Convert a diameter to a circumference assuming a circular cross-section
 *  (c = π · d). Pass-through for null. */
export const diameterToCircumference = (
  diameter: number | null | undefined,
): number | null => (diameter == null ? null : diameter * Math.PI);
