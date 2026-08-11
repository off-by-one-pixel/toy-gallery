'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { buildTimeOfDay } from '../../services/timeOfDay';
import type { Session } from '../../services/types';
import FrequencyStrip from './FrequencyStrip';

type Props = Readonly<{ sessions: readonly Session[] }>;

export default function TimeOfDayStrip({ sessions }: Props) {
  const t = useTranslations('session.timeOfDay');
  const locale = useLocale();
  const tod = useMemo(() => buildTimeOfDay(sessions), [sessions]);

  const hourLabel = (hour: number) => new Date(2000, 0, 1, hour).toLocaleTimeString(locale, { hour: 'numeric' });

  return (
    <FrequencyStrip
      title={t('title')}
      emptyLabel={t('empty')}
      total={tod.total}
      legendMin={0}
      max={tod.max}
      legendGradient={tod.legendGradient}
      cells={tod.cells.map((cell) => ({
        key: cell.hour,
        label: cell.hour,
        fill: cell.fill,
        tooltip: t('tooltip', { hour: hourLabel(cell.hour), count: cell.count }),
      }))}
    />
  );
}
