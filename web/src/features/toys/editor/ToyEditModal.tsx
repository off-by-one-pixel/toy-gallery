'use client';

import { useState } from 'react';

import { Alert } from '@heroui/react';

import AppModal from '@/components/AppModal';
import ConfirmModal from '@/components/ConfirmModal';
import { useTranslations } from 'next-intl';
import { ToyEditor } from 'toy-editor';
import type { StyleOption } from 'toy-editor';

import type { WizardDialog, WizardStage, WizardStep } from '@/features/toys/editor/useToyEditorWizardNav';
import { templateJsonToEditor } from '@/features/toys/converters/templateJson';
import type { ToyEditMode } from '@/features/toys/editor/toyEditForm';
import { useUnit } from '@/features/preferences/UnitProvider';
import { useBeforeUnloadWarning } from '@/hooks/useBeforeUnloadWarning';
import NewToyTemplateStep from '@/features/toys/template/NewToyTemplateStep';
import Header from '@/features/toys/editor/Header';
import IdentificationGroup from '@/features/toys/editor/IdentificationGroup';
import JsonDialogs from '@/features/toys/editor/JsonDialogs';
import { NEW_TOY_MM, PRESET_COLORS } from '@/features/toys/editor/constants';
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
  const t = useTranslations('toy');
  const { unit } = useUnit();
  const form = useToyEditForm(mode);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  useBeforeUnloadWarning(form.dirty);

  const requestClose = () => {
    if (form.dirty) setConfirmingDiscard(true);
    else onClose();
  };

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

  const style: StyleOption = {
    borderWidth: 2,
    borderColor: '#1f2937',
    color: form.identity.color,
  };

  return (
    <>
      <AppModal
        label={t('editorDialogLabel')}
        onClose={requestClose}
        size="full"
        className="flex flex-col overflow-hidden"
      >
        <Header
          mode={mode}
          effectiveStage={effectiveStage}
          saving={form.saving}
          onBack={effectiveStage === 'template' && step === 'size' ? () => onStepChange('template') : requestClose}
          onClose={requestClose}
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
              palette={PRESET_COLORS}
              leadingSlot={<IdentificationGroup form={form} />}
            />
          )}
        </div>
      </AppModal>
      <JsonDialogs
        dialog={dialog}
        exportText={form.exportText}
        onClose={() => onDialogChange(null)}
        onImport={handleJsonImport}
      />
      {confirmingDiscard && (
        <ConfirmModal
          onClose={() => setConfirmingDiscard(false)}
          title={t('discardConfirmTitle')}
          body={t('discardConfirmBody')}
          confirmLabel={t('discard')}
          confirmVariant="danger"
          onConfirm={onClose}
        />
      )}
    </>
  );
}
