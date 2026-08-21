import type { Toy } from '@/api/types';
import { TOY_PROPERTIES, type ToyPropertyContext } from '@/features/toys/properties';
import type { ToySort } from '@/features/toys/toySort';

export type CardSortValue = Readonly<{ label: string; value: string }>;

export function cardSortValue(sort: ToySort | null, toy: Toy, ctx: ToyPropertyContext): CardSortValue | null {
  if (!sort) return null;
  const property = TOY_PROPERTIES[sort.column];
  if (property.onCard) return null;
  const value = property.format(toy, ctx);
  return value == null ? null : { label: property.label(ctx), value };
}
