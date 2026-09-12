'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { Toy } from '@/api/types';
import { useGirth } from '@/features/preferences/GirthProvider';
import { TOY_PROPERTIES, type ToyLabelContext, type ToyPropertyKey } from '@/features/toys/properties';
import { attrKeyOf, galleryToySortConfig, TOY_SORT, type ToySortColumn } from '@/features/toys/toySort';
import SortControl from '@/components/SortControl';

type Props = Readonly<{ toys?: readonly Toy[] }>;

export default function ToySortControl({ toys }: Props) {
  const { girth } = useGirth();
  const t = useTranslations();
  const ctx: ToyLabelContext = { t: t as unknown as ToyLabelContext['t'], girth };
  const config = useMemo(() => (toys ? galleryToySortConfig(toys) : TOY_SORT), [toys]);
  const columnLabel = (column: ToySortColumn): string =>
    attrKeyOf(column) ?? TOY_PROPERTIES[column as ToyPropertyKey].label(ctx);
  return <SortControl config={config} columnLabel={columnLabel} />;
}
