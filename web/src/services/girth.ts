import { circumferenceToDiameter } from '@/services/units';

export const GIRTHS = ['circumference', 'diameter'] as const;
export type Girth = (typeof GIRTHS)[number];

export const DEFAULT_GIRTH: Girth = 'circumference';

export const isGirth = (value: string): value is Girth => (GIRTHS as readonly string[]).includes(value);

export const displayGirth = (circumferenceMm: number | null | undefined, girth: Girth): number | null =>
  girth === 'diameter' ? circumferenceToDiameter(circumferenceMm) : (circumferenceMm ?? null);
