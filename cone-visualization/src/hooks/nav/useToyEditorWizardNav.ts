'use client';

import { useEnumParam, useUrlUpdate } from '../useUrlNav';

const STAGES = ['template', 'editor'] as const;
const STEPS = ['template', 'size'] as const;
const DIALOGS = ['export', 'import'] as const;

export type WizardStage = (typeof STAGES)[number];
export type WizardStep = (typeof STEPS)[number];
export type WizardDialog = (typeof DIALOGS)[number];

export function useToyEditorWizardNav() {
  const update = useUrlUpdate();
  return {
    stage: useEnumParam<WizardStage>('stage', STAGES) ?? 'template',
    step: useEnumParam<WizardStep>('step', STEPS) ?? 'template',
    dialog: useEnumParam<WizardDialog>('dialog', DIALOGS),
    goToStage: (next: WizardStage) => update({ stage: next, dialog: null }),
    goToStep: (next: WizardStep) => update({ step: next }),
    openDialog: (next: WizardDialog) => update({ dialog: next }),
    closeDialog: () => update({ dialog: null }),
  };
}
