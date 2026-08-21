import type { Toy } from '@/api/types';
import { formatValue, type Unit } from '@/features/preferences/units';
import { formatDuration } from '@/lib/duration';
import type { ToySort } from '@/features/toys/toySort';

export type CardSortLabelKey = 'common.totalLength' | 'sort.column.popularity' | 'sort.column.duration';

export type CardSortValue = Readonly<{ labelKey: CardSortLabelKey; value: string }>;

export function cardSortValue(sort: ToySort | null, toy: Toy, unit: Unit, locale: string): CardSortValue | null {
  switch (sort?.column) {
    case 'total':
      return toy.totalLength == null
        ? null
        : { labelKey: 'common.totalLength', value: `${formatValue(toy.totalLength, unit)} ${unit.id}` };
    case 'popularity':
      return { labelKey: 'sort.column.popularity', value: `${toy.usageCount ?? 0}` };
    case 'duration':
      return { labelKey: 'sort.column.duration', value: formatDuration(toy.totalDurationMinutes ?? 0, locale) };
    default:
      return null;
  }
}
