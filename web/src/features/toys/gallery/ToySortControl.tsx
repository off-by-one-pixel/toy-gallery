'use client';

import { useMemo } from 'react';

import type { Toy } from '@/api/types';
import { TOY_PROPERTIES, type ToyPropertyKey } from '@/features/toys/properties';
import { useToyPropertyContext } from '@/features/toys/useToyPropertyContext';
import { attrKeyOf, galleryToySortConfig, TOY_SORT, type ToySortColumn } from '@/features/toys/toySort';
import SortControl from '@/components/SortControl';

type Props = Readonly<{ toys?: readonly Toy[] }>;

export default function ToySortControl({ toys }: Props) {
  const ctx = useToyPropertyContext();
  const config = useMemo(() => (toys ? galleryToySortConfig(toys) : TOY_SORT), [toys]);
  const columnLabel = (column: ToySortColumn): string =>
    attrKeyOf(column) ?? TOY_PROPERTIES[column as ToyPropertyKey].label(ctx);
  return <SortControl config={config} columnLabel={columnLabel} />;
}
