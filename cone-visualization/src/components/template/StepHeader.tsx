'use client';

import { Check } from 'lucide-react';

import {
  TEMPLATE_PICKER_SUBTITLE,
  TEMPLATE_PICKER_TITLE,
  TEMPLATE_SIZE_SUBTITLE,
  TEMPLATE_SIZE_TITLE,
  templateStepAriaLabel,
} from '../../labels';
import type { WizardStep } from '../../hooks/nav/useToyEditorWizardNav';

export default function StepHeader({ step }: Readonly<{ step: WizardStep }>) {
  const stepNumber = step === 'template' ? 1 : 2;
  const title = step === 'template' ? TEMPLATE_PICKER_TITLE : TEMPLATE_SIZE_TITLE;
  const subtitle = step === 'template' ? TEMPLATE_PICKER_SUBTITLE : TEMPLATE_SIZE_SUBTITLE;
  return (
    <div className="border-b border-neutral-200 bg-white px-4 pt-5 pb-4 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <StepIndicator current={stepNumber} total={2} />
        <h3 className="mt-3 text-base font-semibold text-neutral-900">{title}</h3>
        <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
      </div>
    </div>
  );
}

function StepIndicator({ current, total }: Readonly<{ current: number; total: number }>) {
  return (
    <ol className="flex items-center gap-2" aria-label={templateStepAriaLabel(current, total)}>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const active = n === current;
        const done = n < current;
        return (
          <li key={n} className="flex items-center gap-2">
            <span
              className={
                'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ' +
                (done
                  ? 'bg-blue-600 text-white'
                  : active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-neutral-300 bg-white text-neutral-500')
              }
            >
              {done ? <Check size={12} strokeWidth={3} /> : n}
            </span>
            {n < total && <span className="h-px w-8 bg-neutral-300" />}
          </li>
        );
      })}
    </ol>
  );
}
