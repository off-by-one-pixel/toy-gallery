'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { canStepForward, currentPeriod, type Period, periodLabel, stepPeriod } from '@/features/sessions/session';

type Props = Readonly<{ period: Period; onChange: (next: Period) => void }>;

export default function PeriodStepper({ period, onChange }: Props) {
  const t = useTranslations('session.period');
  const locale = useLocale();
  if (period.kind === 'all') return null;
  const forward = canStepForward(period);

  return (
    <div className="inline-flex h-8 items-center gap-0.5 rounded-lg bg-surface-tertiary/70 px-1">
      <button
        type="button"
        aria-label={t('previous')}
        onClick={() => onChange(stepPeriod(period, -1))}
        className="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-foreground"
      >
        <ChevronLeft size={14} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        aria-label={t('current')}
        onClick={() => onChange(currentPeriod(period.kind))}
        className="px-1.5 text-xs font-medium tabular-nums text-foreground whitespace-nowrap"
      >
        {periodLabel(period, locale)}
      </button>
      <button
        type="button"
        aria-label={t('next')}
        disabled={!forward}
        onClick={() => onChange(stepPeriod(period, 1))}
        className="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
      >
        <ChevronRight size={14} strokeWidth={2.2} />
      </button>
    </div>
  );
}
