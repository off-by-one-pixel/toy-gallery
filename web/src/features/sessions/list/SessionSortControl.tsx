'use client';

import { useTranslations } from 'next-intl';

import { useGirth } from '@/features/preferences/useGirth';
import { SESSION_SORT, type SessionSortColumn } from '@/features/sessions/sessionSort';
import SortControl from '@/components/SortControl';

export default function SessionSortControl() {
  const { girth } = useGirth();
  const tSort = useTranslations('sort');
  const columnLabel = (column: SessionSortColumn): string => {
    switch (column) {
      case 'started_at':
        return tSort('column.date');
      case 'duration':
        return tSort('column.duration');
      case 'length':
        return tSort('column.peakLength');
      default:
        return tSort(`column.peakGirth.${girth}`);
    }
  };
  return <SortControl config={SESSION_SORT} columnLabel={columnLabel} />;
}
