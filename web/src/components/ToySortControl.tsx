'use client';

import { useTranslations } from 'next-intl';

import { useGirth } from '../providers/GirthProvider';
import { TOY_SORT, type ToySortColumn } from '../services/toySort';
import SortControl from './SortControl';

export default function ToySortControl() {
  const { girth } = useGirth();
  const t = useTranslations('sort');
  const common = useTranslations('common');
  const columnLabel = (column: ToySortColumn): string => {
    switch (column) {
      case 'name':
        return t('column.name');
      case 'insertable':
        return common('insertable');
      case 'total':
        return common('totalLength');
      case 'circumference':
        return common(girth);
      case 'popularity':
        return t('column.popularity');
      case 'duration':
        return t('column.duration');
    }
  };
  return <SortControl config={TOY_SORT} columnLabel={columnLabel} />;
}
