// Visible silhouette height for a toy, expressed as a fraction of the
// tallest toy in its group. Pairs with the `top: (1 - ratio) * 100%`
// trick used by ToyCard / MiniToy to anchor the silhouette to the bottom
// of its stage so smaller toys read as proportionally smaller.

const MIN_RATIO = 0.15;

interface HasHeight {
  height: number;
}

export const heightScale = (
  toys: (HasHeight | null | undefined)[],
): ((toy: HasHeight | null | undefined) => number) => {
  const heights = toys.map((t) => t?.height ?? 0);
  const max = Math.max(1, ...heights);
  return (toy) => (toy ? Math.max(MIN_RATIO, toy.height / max) : 1);
};
