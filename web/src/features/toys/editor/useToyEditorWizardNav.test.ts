import { describe, expect, it } from 'vitest';

import { wizardUpdates } from '@/features/toys/editor/useToyEditorWizardNav';

describe('wizardUpdates', () => {
  it('goToStage sets the stage and clears any open dialog', () => {
    expect(wizardUpdates.goToStage('editor')).toEqual({ stage: 'editor', dialog: null });
  });

  it('goToStep sets the step without touching other keys', () => {
    expect(wizardUpdates.goToStep('size')).toEqual({ step: 'size' });
  });

  it('openDialog sets the requested dialog', () => {
    expect(wizardUpdates.openDialog('export')).toEqual({ dialog: 'export' });
    expect(wizardUpdates.openDialog('import')).toEqual({ dialog: 'import' });
  });

  it('closeDialog nulls the dialog key', () => {
    expect(wizardUpdates.closeDialog()).toEqual({ dialog: null });
  });
});
