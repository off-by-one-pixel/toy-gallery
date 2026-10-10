import type { Toy } from '@/api/types';

const haystack = (t: Toy): string => `${t.brand} ${t.name} ${t.size}`.toLowerCase();

export const filterToys = (toys: Toy[], query: string): Toy[] => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return toys;
  return toys.filter((toy) => {
    const target = haystack(toy);
    return terms.every((term) => target.includes(term));
  });
};
