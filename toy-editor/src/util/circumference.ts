export const circumferenceToDiameter = (circumference: number | null | undefined): number | null =>
  circumference == null ? null : circumference / Math.PI;

export const diameterToCircumference = (diameter: number | null | undefined): number | null =>
  diameter == null ? null : diameter * Math.PI;
