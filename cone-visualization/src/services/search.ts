import type { Toy } from './types';

const haystack = (t: Toy): string =>
  `${t.brand} ${t.name} ${t.size}`.toLowerCase();

// Whitespace-separated terms, all of which must appear somewhere in the
// concatenated brand+name+size string. So "bad small" matches a Bad Dragon
// toy of size Small, even though no single field contains both words.
export const filterToys = (toys: Toy[], query: string): Toy[] => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return toys;
  return toys.filter((toy) => {
    const target = haystack(toy);
    return terms.every((term) => target.includes(term));
  });
};
