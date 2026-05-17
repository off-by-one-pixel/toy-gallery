'use client';

import type { Toy as EditorToy } from 'cone-editor';

import type { WizardStep } from '../../hooks/nav/useToyEditorWizardNav';
import { templateToEditor } from '../../services/converters/template';
import { TOY_TEMPLATES } from '../../services/toyTemplates';
import { useUnit } from '../../providers/UnitProvider';
import SizeForm from './SizeForm';
import StepHeader from './StepHeader';
import TemplatePicker from './TemplatePicker';
import { useTemplateForm } from './useTemplateForm';

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
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <StepHeader step={step} />

      {step === 'template' ? (
        <TemplatePicker onSelect={handleSelectTemplate} onSkip={onSkip} />
      ) : (
        <SizeForm form={form} onBack={() => onStepChange('template')} onContinue={handleContinue} />
      )}
    </div>
  );
}
