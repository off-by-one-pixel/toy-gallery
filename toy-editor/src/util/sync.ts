export const snapToNearest = (value: number, candidates: ReadonlyArray<number | null>, threshold: number): number => {
  let nearest = value;
  let distance = threshold;
  for (const c of candidates) {
    if (c != null && Math.abs(value - c) < distance) {
      nearest = c;
      distance = Math.abs(value - c);
    }
  }
  return nearest;
};
