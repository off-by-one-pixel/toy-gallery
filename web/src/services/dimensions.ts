import type { Toy } from './types';

export const silhouetteHeight = (toy: Toy): number => toy.shape.sections.reduce((acc, s) => acc + s.height, 0);

export const silhouetteDiameter = (toy: Toy): number => {
  const diameters = toy.shape.sections.map((s) => s.diameter);
  return diameters.length ? Math.max(...diameters) : 0;
};
