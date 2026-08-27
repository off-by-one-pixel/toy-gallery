import { silhouetteHeight } from '@/features/toys/dimensions';
import type { Toy } from '@/api/types';

type Shaped = Pick<Toy, 'shape'>;

const MIN_RATIO = 0.15;

export const maxSilhouetteHeight = (toys: readonly (Shaped | null | undefined)[]): number =>
  Math.max(1, ...toys.map((t) => (t ? silhouetteHeight(t) : 0)));

export const heightScale = (toys: (Toy | null | undefined)[]): ((toy: Toy | null | undefined) => number) => {
  const max = maxSilhouetteHeight(toys);
  return (toy) => (toy ? Math.max(MIN_RATIO, silhouetteHeight(toy) / max) : 1);
};

export const heightRatioFor = (heightMm: number, maxHeightMm: number): number =>
  Math.max(MIN_RATIO, heightMm / Math.max(1, maxHeightMm));
