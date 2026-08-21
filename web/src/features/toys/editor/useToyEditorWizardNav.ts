'use client';

import { type Update, useEnumParam, useUrlUpdate } from '@/hooks/useUrlNav';

const STAGES = ['template', 'editor'] as const;
const STEPS = ['template', 'size'] as const;
const DIALOGS = ['export', 'import'] as const;

export type WizardStage = (typeof STAGES)[number];
export type WizardStep = (typeof STEPS)[number];
export type WizardDialog = (typeof DIALOGS)[number];

/** Pure URL-update producers for the new-toy wizard. */
export const wizardUpdates = {
  goToStage: (next: WizardStage): Update => ({ stage: next, dialog: null }),
  goToStep: (next: WizardStep): Update => ({ step: next }),
  openDialog: (next: WizardDialog): Update => ({ dialog: next }),
  closeDialog: (): Update => ({ dialog: null }),
};

export function useToyEditorWizardNav() {
  const update = useUrlUpdate();
  return {
    stage: useEnumParam<WizardStage>('stage', STAGES) ?? 'template',
    step: useEnumParam<WizardStep>('step', STEPS) ?? 'template',
    dialog: useEnumParam<WizardDialog>('dialog', DIALOGS),
    goToStage: (next: WizardStage) => update(wizardUpdates.goToStage(next)),
    goToStep: (next: WizardStep) => update(wizardUpdates.goToStep(next)),
    openDialog: (next: WizardDialog) => update(wizardUpdates.openDialog(next)),
    closeDialog: () => update(wizardUpdates.closeDialog()),
  };
}
