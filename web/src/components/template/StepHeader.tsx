'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { WizardStep } from '../../hooks/nav/useToyEditorWizardNav';

export default function StepHeader({ step }: Readonly<{ step: WizardStep }>) {
  const t = useTranslations('template');
  const stepNumber = step === 'template' ? 1 : 2;
  const title = step === 'template' ? t('pickerTitle') : t('sizeTitle');
  const subtitle = step === 'template' ? t('pickerSubtitle') : t('sizeSubtitle');
  return (
    <div className="border-b border-border bg-surface px-4 pt-5 pb-4 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <StepIndicator current={stepNumber} total={2} />
        <h3 className="mt-3 text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function StepIndicator({ current, total }: Readonly<{ current: number; total: number }>) {
  const t = useTranslations('template');
  return (
    <ol className="flex items-center gap-2" aria-label={t('stepAria', { current, total })}>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const active = n === current;
        const done = n < current;
        return (
          <li key={n} className="flex items-center gap-2">
            <span
              className={
                'inline-flex h-6 w-6 items-center justify-center rounded-full text-caption font-semibold transition-colors ' +
                (done
                  ? 'bg-accent text-accent-foreground'
                  : active
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'border border-border-secondary bg-surface text-muted')
              }
            >
              {done ? <Check size={12} strokeWidth={3} /> : n}
            </span>
            {n < total && <span className="h-px w-8 bg-border-secondary" />}
          </li>
        );
      })}
    </ol>
  );
}
