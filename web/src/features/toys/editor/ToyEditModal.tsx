'use client';

import { useState } from 'react';

import { Alert } from '@heroui/react';

import AppModal from '@/components/AppModal';
import ConfirmModal from '@/components/ConfirmModal';
import { useTranslations } from 'next-intl';
import { ToyEditor } from 'toy-editor';
import type { StyleOption } from 'toy-editor';

import { useToyEditorWizardNav, type WizardStage } from '@/features/toys/editor/useToyEditorWizardNav';
import { templateJsonToEditor } from '@/features/toys/converters/templateJson';
import type { ToyEditMode } from '@/features/toys/editor/toyEditForm';
import { useUnit } from '@/features/preferences/useUnit';
import { useBeforeUnloadWarning } from '@/hooks/useBeforeUnloadWarning';
import NewToyTemplateStep from '@/features/toys/template/NewToyTemplateStep';
import TemplateJsonDialog from '@/features/toys/template/TemplateJsonDialog';
import Header from '@/features/toys/editor/Header';
import IdentificationGroup from '@/features/toys/editor/IdentificationGroup';
import { NEW_TOY_MM } from '@/features/toys/editor/constants';
import { usePresetPalette } from '@/features/toys/editor/usePresetPalette';
import { useToyEditorLabels } from '@/features/toys/editor/useToyEditorLabels';
import { useToyEditForm } from '@/features/toys/editor/useToyEditForm';

type Props = Readonly<{
  mode: ToyEditMode;
  onClose: () => void;
  onSaved: () => void;
}>;

export default function ToyEditModal({ mode, onClose, onSaved }: Props) {
  const t = useTranslations('toy');
  const { stage, step, dialog, goToStage, goToStep, openDialog, closeDialog } = useToyEditorWizardNav();
  const { unit } = useUnit();
  const palette = usePresetPalette();
  const editorLabels = useToyEditorLabels();
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
    goToStage('editor');
  };

  const handleJsonImport = (text: string) => {
    const next = templateJsonToEditor(text);
    form.setPickedInitial(next);
    form.hydrate(next);
    goToStage('editor');
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
          onBack={effectiveStage === 'template' && step === 'size' ? () => goToStep('template') : requestClose}
          onClose={requestClose}
          onSave={() => form.save(mode, onSaved)}
          onOpenExport={() => openDialog('export')}
          onOpenImport={() => openDialog('import')}
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
              onStepChange={goToStep}
              onPick={goToEditor}
              onSkip={() => goToEditor(NEW_TOY_MM)}
            />
          ) : (
            <ToyEditor
              initialToy={form.initialToy ?? NEW_TOY_MM}
              style={style}
              unit={unit}
              palette={palette}
              labels={editorLabels}
              leadingSlot={<IdentificationGroup form={form} />}
            />
          )}
        </div>
      </AppModal>
      {dialog === 'export' && <TemplateJsonDialog mode="export" initialText={form.exportText} onClose={closeDialog} />}
      {dialog === 'import' && <TemplateJsonDialog mode="import" onClose={closeDialog} onImport={handleJsonImport} />}
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
