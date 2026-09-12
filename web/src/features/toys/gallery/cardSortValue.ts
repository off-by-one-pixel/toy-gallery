import type { Toy } from '@/api/types';
import { TOY_PROPERTIES, type ToyPropertyContext, type ToyPropertyKey } from '@/features/toys/properties';
import { attrKeyOf, type ToySort } from '@/features/toys/toySort';

export type CardSortValue = Readonly<{ label: string; value: string }>;

export function cardSortValue(sort: ToySort, toy: Toy, ctx: ToyPropertyContext): CardSortValue | null {
  const attrKey = attrKeyOf(sort.column);
  if (attrKey !== null) {
    const value = toy.customAttributes?.[attrKey];
    return value == null ? null : { label: attrKey, value };
  }
  const property = TOY_PROPERTIES[sort.column as ToyPropertyKey];
  if (property.onCard) return null;
  const value = property.format(toy, ctx);
  return value == null ? null : { label: property.label(ctx), value };
}
