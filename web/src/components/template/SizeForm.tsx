'use client';

import { useMemo } from 'react';
import { Button } from '@heroui/react';
import { ThumbnailRender } from 'toy-editor';
import type { Toy as EditorToy } from 'toy-editor';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { templateToEditor } from '../../services/converters/template';
import type { SizeMode } from '../../services/templateForm';
import { useUnit } from '../../providers/UnitProvider';
import { type Unit } from '../../services/units';
import TextInput from '../TextInput';
import { PREVIEW_STYLE } from './styles';
import type { TemplateForm } from './useTemplateForm';

type Props = Readonly<{
  form: TemplateForm;
  onBack: () => void;
  onContinue: () => void;
}>;

export default function SizeForm({ form, onBack, onContinue }: Props) {
  const { unit } = useUnit();
  const t = useTranslations('template');
  const common = useTranslations('common');
  const { state, selectedTemplate: template, totalMm, insertableMm, maxDiameterMm } = form;

  const previewToy = useMemo<EditorToy | null>(() => {
    if (!template || totalMm == null || maxDiameterMm == null) return null;
    return templateToEditor({ template, totalMm, maxDiameterMm });
  }, [template, totalMm, maxDiameterMm]);

  const canContinue = template != null && totalMm != null && insertableMm != null && maxDiameterMm != null;
  const sizeFieldLabel = state.sizeMode === 'diameter' ? t('fieldMaxDiameter') : common('circumference');

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-md flex-col gap-5">
          {template && (
            <div className="text-center text-xs uppercase tracking-[0.08em] text-neutral-500">
              {t('pickedShapePrefix')} · <span className="text-neutral-700">{template.name}</span>
            </div>
          )}

          <div className="flex h-56 items-end justify-center rounded-2xl border border-neutral-200 bg-neutral-50">
            {previewToy && <ThumbnailRender toy={previewToy} scaleFactor={1} style={PREVIEW_STYLE} />}
          </div>

          <div className="flex flex-col gap-3">
            <SizeField label={common('totalLength')} value={state.totalInput} onChange={form.changeTotal} unit={unit} />
            <SizeField
              label={t('fieldInsertableLength')}
              value={state.insertableInput}
              onChange={form.changeInsertable}
              unit={unit}
            />
            <SizeField
              label={sizeFieldLabel}
              value={state.sizeInput}
              onChange={form.changeSize}
              unit={unit}
              trailing={<ModeToggle value={state.sizeMode} onChange={form.changeSizeMode} />}
            />
          </div>
        </div>
      </div>

      <footer className="flex items-center gap-2 border-t border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <Button variant="outline" size="sm" onPress={onBack}>
          <ArrowLeft size={14} strokeWidth={2} />
          {common('back')}
        </Button>
        <div className="flex-1" />
        <Button variant="primary" size="sm" isDisabled={!canContinue} onPress={onContinue}>
          {t('continue')}
        </Button>
      </footer>
    </>
  );
}

type SizeFieldProps = Readonly<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: Unit;
  trailing?: React.ReactNode;
}>;

function SizeField({ label, value, onChange, unit, trailing }: SizeFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</span>
      <TextInput
        size="sm"
        type="number"
        inputMode="decimal"
        min={0}
        step={unit.id === 'in' ? 0.1 : 1}
        value={value}
        onChange={onChange}
        trailing={
          <span className="flex items-center gap-2 text-xs text-neutral-500">
            <span>{unit.id}</span>
            {trailing}
          </span>
        }
      />
    </label>
  );
}

type ModeToggleProps = Readonly<{
  value: SizeMode;
  onChange: (next: SizeMode) => void;
}>;

function ModeToggle({ value, onChange }: ModeToggleProps) {
  return (
    <span className="inline-flex rounded-md border border-neutral-200 bg-neutral-100 p-0.5">
      {(['diameter', 'circumference'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={
            'rounded px-2 py-0.5 text-[11px] font-medium transition-colors ' +
            (value === m ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700')
          }
        >
          {m === 'diameter' ? 'Ø' : 'C'}
        </button>
      ))}
    </span>
  );
}
