'use client';

import { parseEnumParam, type Update, useNavigation } from '@/hooks/useNavigation';

const STAGES = ['template', 'editor'] as const;
const STEPS = ['template', 'size'] as const;
const DIALOGS = ['export', 'import'] as const;

export type WizardStage = (typeof STAGES)[number];
export type WizardStep = (typeof STEPS)[number];
export type WizardDialog = (typeof DIALOGS)[number];

export const wizardUpdates = {
  goToStage: (next: WizardStage): Update => ({ stage: next, dialog: null }),
  goToStep: (next: WizardStep): Update => ({ step: next }),
  openDialog: (next: WizardDialog): Update => ({ dialog: next }),
  closeDialog: (): Update => ({ dialog: null }),
};

export function useToyEditorWizardNav() {
  const { param, updateParams: update } = useNavigation();
  return {
    stage: parseEnumParam<WizardStage>(param('stage'), STAGES) ?? 'template',
    step: parseEnumParam<WizardStep>(param('step'), STEPS) ?? 'template',
    dialog: parseEnumParam<WizardDialog>(param('dialog'), DIALOGS),
    goToStage: (next: WizardStage) => update(wizardUpdates.goToStage(next)),
    goToStep: (next: WizardStep) => update(wizardUpdates.goToStep(next)),
    openDialog: (next: WizardDialog) => update(wizardUpdates.openDialog(next)),
    closeDialog: () => update(wizardUpdates.closeDialog()),
  };
}
