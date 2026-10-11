export const snapToNearest = (value: number, candidates: ReadonlyArray<number | null>, threshold: number): number => {
  for (const c of candidates) {
    if (c != null && Math.abs(value - c) < threshold) return c;
  }
  return value;
};
