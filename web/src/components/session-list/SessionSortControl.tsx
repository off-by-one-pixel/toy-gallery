'use client';

import { useTranslations } from 'next-intl';

import { useGirth } from '../../providers/GirthProvider';
import { SESSION_SORT, type SessionSortColumn } from '../../services/sessionSort';
import SortControl from '../SortControl';

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
        return girth === 'diameter' ? tSort('column.peakDiameter') : tSort('column.peakCircumference');
    }
  };
  return <SortControl config={SESSION_SORT} columnLabel={columnLabel} />;
}
