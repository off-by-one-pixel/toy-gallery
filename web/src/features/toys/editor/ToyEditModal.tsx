'use client';

import { Alert, Modal, useOverlayState } from '@heroui/react';
import { ToyEditor } from 'toy-editor';
import type { StyleOption } from 'toy-editor';

import type { WizardDialog, WizardStage, WizardStep } from '@/features/toys/editor/useToyEditorWizardNav';
import { templateJsonToEditor } from '@/features/toys/converters/templateJson';
import type { ToyEditMode } from '@/features/toys/editor/toyEditForm';
import { useUnit } from '@/providers/UnitProvider';
import NewToyTemplateStep from '@/features/toys/template/NewToyTemplateStep';
import Header from '@/features/toys/editor/Header';
import IdentificationGroup from '@/features/toys/editor/IdentificationGroup';
import JsonDialogs from '@/features/toys/editor/JsonDialogs';
import { NEW_TOY_MM } from '@/features/toys/editor/constants';
import { useToyEditForm } from '@/features/toys/editor/useToyEditForm';

type Props = Readonly<{
  mode: ToyEditMode;
  stage: WizardStage;
  step: WizardStep;
  dialog: WizardDialog | null;
  onStageChange: (next: WizardStage) => void;
  onStepChange: (next: WizardStep) => void;
  onDialogChange: (next: WizardDialog | null) => void;
  onClose: () => void;
  onSaved: () => void;
}>;

export default function ToyEditModal({
  mode,
  stage,
  step,
  dialog,
  onStageChange,
  onStepChange,
  onDialogChange,
  onClose,
  onSaved,
}: Props) {
  const { unit } = useUnit();
  const form = useToyEditForm(mode);

  // Edit / copy modes always sit in the editor stage — the picker
  // doesn't apply, so we ignore an inbound `stage` other than 'editor'.
  const effectiveStage: WizardStage = mode.kind === 'new' ? stage : 'editor';

  const goToEditor = (next: typeof NEW_TOY_MM) => {
    form.setPickedInitial(next);
    onStageChange('editor');
  };

  const handleJsonImport = (text: string) => {
    const next = templateJsonToEditor(text);
    form.setPickedInitial(next);
    form.hydrate(next);
    onStageChange('editor');
  };

  const overlayState = useOverlayState({
    defaultOpen: true,
    onOpenChange: (isOpen) => {
      if (!isOpen) onClose();
    },
  });

  const style: StyleOption = {
    borderWidth: 2,
    borderColor: '#1f2937',
    color: form.identity.color,
  };

  return (
    <Modal.Root state={overlayState}>
      <Modal.Backdrop>
        <Modal.Container size="full" placement="center">
          <Modal.Dialog className="flex flex-col overflow-hidden">
            <Header
              mode={mode}
              effectiveStage={effectiveStage}
              saving={form.saving}
              onBack={
                effectiveStage === 'template' && step === 'size'
                  ? () => onStepChange('template')
                  : () => overlayState.close()
              }
              onClose={() => overlayState.close()}
              onSave={() => form.save(mode, onSaved)}
              onOpenExport={() => onDialogChange('export')}
              onOpenImport={() => onDialogChange('import')}
            />

            {form.error && (
              <Alert status="danger" className="rounded-none">
                <Alert.Description>{form.error}</Alert.Description>
              </Alert>
            )}

            <div className="flex-1 min-h-0">
              {effectiveStage === 'template' ? (
                <NewToyTemplateStep
                  step={step}
                  onStepChange={onStepChange}
                  onPick={goToEditor}
                  onSkip={() => goToEditor(NEW_TOY_MM)}
                />
              ) : (
                <ToyEditor
                  initialToy={form.initialToy ?? NEW_TOY_MM}
                  style={style}
                  unit={unit}
                  leadingSlot={<IdentificationGroup form={form} />}
                />
              )}
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      <JsonDialogs
        dialog={dialog}
        exportText={form.exportText}
        onClose={() => onDialogChange(null)}
        onImport={handleJsonImport}
      />
    </Modal.Root>
  );
}
