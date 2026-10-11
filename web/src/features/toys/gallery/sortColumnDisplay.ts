import type { Toy } from '@/api/types';
import { TOY_PROPERTIES, type ToyPropertyContext, type ToyPropertyKey } from '@/features/toys/properties';
import { attrKeyOf, type ToySortColumn } from '@/features/toys/toySort';

export type SortColumnDisplay = Readonly<{ label: string; valueFor: (toy: Toy) => string | null }>;

export function sortColumnDisplay(column: ToySortColumn, ctx: ToyPropertyContext): SortColumnDisplay | null {
  const attrKey = attrKeyOf(column);
  if (attrKey !== null) {
    return { label: attrKey, valueFor: (toy) => toy.customAttributes?.[attrKey] ?? null };
  }
  const property = TOY_PROPERTIES[column as ToyPropertyKey];
  if (property.onCard) return null;
  return { label: property.label(ctx), valueFor: (toy) => property.format(toy, ctx) };
}
