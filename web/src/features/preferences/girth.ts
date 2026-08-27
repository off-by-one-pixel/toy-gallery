import { circumferenceToDiameter } from '@/features/preferences/units';

export const GIRTHS = ['circumference', 'diameter'] as const;
export type Girth = (typeof GIRTHS)[number];

export const DEFAULT_GIRTH: Girth = 'circumference';

export const displayGirth = (circumferenceMm: number | null | undefined, girth: Girth): number | null =>
  girth === 'diameter' ? circumferenceToDiameter(circumferenceMm) : (circumferenceMm ?? null);
