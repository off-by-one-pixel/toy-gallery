import type { Toy } from '@/api/types';

type Shaped = Pick<Toy, 'shape'>;

export const silhouetteHeight = (toy: Shaped): number => toy.shape.sections.reduce((acc, s) => acc + s.height, 0);

export const silhouetteDiameter = (toy: Shaped): number => {
  const diameters = toy.shape.sections.map((s) => s.diameter);
  return diameters.length ? Math.max(...diameters) : 0;
};
