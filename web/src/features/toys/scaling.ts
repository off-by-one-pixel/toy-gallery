// Visible silhouette height for a toy, expressed as a fraction of the
// tallest toy in its group. Pairs with the `top: (1 - ratio) * 100%`
// trick used by ToyCard / MiniToy to anchor the silhouette to the bottom
// of its stage so smaller toys read as proportionally smaller.

import { silhouetteHeight } from '@/features/toys/dimensions';
import type { Toy } from '@/api/types';

const MIN_RATIO = 0.15;

export const heightScale = (toys: (Toy | null | undefined)[]): ((toy: Toy | null | undefined) => number) => {
  const heights = toys.map((t) => (t ? silhouetteHeight(t) : 0));
  const max = Math.max(1, ...heights);
  return (toy) => (toy ? Math.max(MIN_RATIO, silhouetteHeight(toy) / max) : 1);
};
