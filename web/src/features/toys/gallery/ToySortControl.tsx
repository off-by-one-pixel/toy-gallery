'use client';

import { useTranslations } from 'next-intl';

import { useGirth } from '@/features/preferences/GirthProvider';
import { TOY_PROPERTIES, type ToyLabelContext } from '@/features/toys/properties';
import { TOY_SORT, type ToySortColumn } from '@/features/toys/toySort';
import SortControl from '@/components/SortControl';

export default function ToySortControl() {
  const { girth } = useGirth();
  const t = useTranslations();
  const ctx: ToyLabelContext = { t: t as unknown as ToyLabelContext['t'], girth };
  const columnLabel = (column: ToySortColumn): string => TOY_PROPERTIES[column].label(ctx);
  return <SortControl config={TOY_SORT} columnLabel={columnLabel} />;
}
