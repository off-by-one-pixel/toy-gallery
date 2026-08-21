'use client';

import type { Toy as EditorToy } from 'toy-editor';

import type { WizardStep } from '@/features/toys/editor/useToyEditorWizardNav';
import { templateToEditor } from '@/features/toys/converters/template';
import { TOY_TEMPLATES } from '@/features/toys/template/toyTemplates';
import { useUnit } from '@/features/preferences/UnitProvider';
import SizeForm from '@/features/toys/template/SizeForm';
import StepHeader from '@/features/toys/template/StepHeader';
import TemplatePicker from '@/features/toys/template/TemplatePicker';
import { useTemplateForm } from '@/features/toys/template/useTemplateForm';

type Props = Readonly<{
  step: WizardStep;
  onStepChange: (next: WizardStep) => void;
  onPick: (initial: EditorToy) => void;
  onSkip: () => void;
}>;

export default function NewToyTemplateStep({ step, onStepChange, onPick, onSkip }: Props) {
  const { unit } = useUnit();
  const form = useTemplateForm(unit);

  const handleSelectTemplate = (id: string) => {
    const template = TOY_TEMPLATES.find((t) => t.id === id);
    if (template) form.selectTemplate(template);
    onStepChange('size');
  };

  const handleContinue = () => {
    if (!form.selectedTemplate || form.totalMm == null || form.maxDiameterMm == null) return;
    onPick(
      templateToEditor({
        template: form.selectedTemplate,
        totalMm: form.totalMm,
        maxDiameterMm: form.maxDiameterMm,
      }),
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface">
      <StepHeader step={step} />

      {step === 'template' ? (
        <TemplatePicker onSelect={handleSelectTemplate} onSkip={onSkip} />
      ) : (
        <SizeForm form={form} onBack={() => onStepChange('template')} onContinue={handleContinue} />
      )}
    </div>
  );
}
