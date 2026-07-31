'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { buildTimeOfDay } from '../../services/timeOfDay';
import type { Session } from '../../services/types';

type Props = Readonly<{ sessions: readonly Session[] }>;

export default function TimeOfDayStrip({ sessions }: Props) {
  const t = useTranslations('session.timeOfDay');
  const locale = useLocale();
  const tod = useMemo(() => buildTimeOfDay(sessions), [sessions]);

  const hourLabel = (hour: number) => new Date(2000, 0, 1, hour).toLocaleTimeString(locale, { hour: 'numeric' });

  return (
    <div className="mx-auto max-w-300 rounded-lg bg-surface/60 px-4 pt-3 pb-4">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{t('title')}</h3>
      {tod.total === 0 ? (
        <p className="py-2 text-caption text-text-tertiary">{t('empty')}</p>
      ) : (
        <>
          <div className="flex gap-0.5">
            {tod.cells.map((cell) => (
              <span
                key={cell.hour}
                className="h-4 flex-1 rounded-sm"
                style={{ background: cell.fill }}
                title={t('tooltip', { hour: hourLabel(cell.hour), count: cell.count })}
              />
            ))}
          </div>
          <div className="mt-1 flex gap-0.5 text-[9px] tabular-nums text-text-tertiary">
            {tod.cells.map((cell) => (
              <span key={cell.hour} className="flex-1 text-center">
                {cell.hour}
              </span>
            ))}
          </div>
          <div className="mt-2 ml-auto flex w-1/3 items-center gap-2 text-caption tabular-nums text-muted">
            <span>0</span>
            <span aria-hidden className="h-1.5 flex-1 rounded-full" style={{ background: tod.legendGradient }} />
            <span>{tod.max}</span>
          </div>
        </>
      )}
    </div>
  );
}
