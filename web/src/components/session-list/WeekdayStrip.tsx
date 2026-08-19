'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { buildWeekday } from '../../services/weekday';
import FrequencyStrip from './FrequencyStrip';

type Props = Readonly<{ counts: readonly number[] }>;

const REFERENCE_MONDAY = new Date(2001, 0, 1);

export default function WeekdayStrip({ counts }: Props) {
  const t = useTranslations('session.weekday');
  const locale = useLocale();
  const weekday = useMemo(() => buildWeekday(counts), [counts]);

  const dayLabel = (dow: number) =>
    new Date(REFERENCE_MONDAY.getFullYear(), 0, REFERENCE_MONDAY.getDate() + dow).toLocaleDateString(locale, {
      weekday: 'short',
    });

  return (
    <FrequencyStrip
      title={t('title')}
      emptyLabel={t('empty')}
      total={weekday.total}
      legendMin={weekday.min}
      max={weekday.max}
      legendGradient={weekday.legendGradient}
      cells={weekday.cells.map((cell) => ({
        key: cell.dow,
        label: dayLabel(cell.dow),
        fill: cell.fill,
        tooltip: t('tooltip', { day: dayLabel(cell.dow), count: cell.count }),
      }))}
    />
  );
}
