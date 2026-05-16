'use client';

import { useMemo, useState } from 'react';
import { Button } from '@heroui/react';
import { ThumbnailRender } from 'cone-editor';
import type { StyleOption, Toy as EditorToy } from 'cone-editor';
import { ArrowLeft, Check, Plus } from 'lucide-react';

import TextInput from './TextInput';
import {
  TEMPLATE_BACK,
  TEMPLATE_BLANK_DESCRIPTION,
  TEMPLATE_BLANK_NAME,
  TEMPLATE_CONTINUE,
  TEMPLATE_FIELD_CIRCUMFERENCE,
  TEMPLATE_FIELD_INSERTABLE_LENGTH,
  TEMPLATE_FIELD_MAX_DIAMETER,
  TEMPLATE_FIELD_TOTAL_LENGTH,
  TEMPLATE_PICKED_SHAPE_PREFIX,
  TEMPLATE_PICKER_SUBTITLE,
  TEMPLATE_PICKER_TITLE,
  TEMPLATE_SIZE_SUBTITLE,
  TEMPLATE_SIZE_TITLE,
  templateStepAriaLabel,
} from '../labels';
import { templateToEditor } from '../services/converters/template';
import { TOY_TEMPLATES } from '../services/toyTemplates';
import type { ToyTemplate } from '../services/types';
import { circumferenceToDiameter, diameterToCircumference, fromMm, toMm, type Unit } from '../services/units';
import { useUnit } from '../providers/UnitProvider';

type Step = 'template' | 'size';
type SizeMode = 'diameter' | 'circumference';

type Props = Readonly<{
  onPick: (initial: EditorToy) => void;
  onSkip: () => void;
}>;

const PREVIEW_STYLE: StyleOption = {
  borderWidth: 1.5,
  borderColor: '#52525b',
  color: '#d4d4d8',
};

const formatForInput = (mm: number, unit: Unit): string => fromMm(mm, unit).toFixed(unit.decimals);

const parseInput = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const v = Number(trimmed.replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? v : null;
};

const parseToMm = (raw: string, unit: Unit): number | null => {
  const v = parseInput(raw);
  return v == null ? null : toMm(v, unit);
};

export default function NewToyTemplateStep({ onPick, onSkip }: Props) {
  const { unit } = useUnit();

  const [step, setStep] = useState<Step>('template');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [totalInput, setTotalInput] = useState('');
  const [insertableInput, setInsertableInput] = useState('');
  const [sizeMode, setSizeMode] = useState<SizeMode>('diameter');
  const [sizeInput, setSizeInput] = useState('');

  const selectedTemplate = useMemo(
    () => (selectedId ? (TOY_TEMPLATES.find((t) => t.id === selectedId) ?? null) : null),
    [selectedId],
  );

  const totalMm = useMemo(() => parseToMm(totalInput, unit), [totalInput, unit]);
  const insertableMm = useMemo(() => parseToMm(insertableInput, unit), [insertableInput, unit]);
  const maxDiameterMm = useMemo(() => {
    const inputMm = parseToMm(sizeInput, unit);
    if (inputMm == null) return null;
    return sizeMode === 'diameter' ? inputMm : circumferenceToDiameter(inputMm);
  }, [sizeInput, sizeMode, unit]);

  const handleSizeMode = (next: SizeMode) => {
    if (next === sizeMode) return;
    const inputMm = parseToMm(sizeInput, unit);
    if (inputMm != null) {
      const convertedMm = next === 'diameter' ? circumferenceToDiameter(inputMm) : diameterToCircumference(inputMm);
      if (convertedMm != null) setSizeInput(formatForInput(convertedMm, unit));
    }
    setSizeMode(next);
  };

  const handleTotalChange = (next: string) => {
    setTotalInput(next);
    if (!selectedTemplate) return;
    const mm = parseToMm(next, unit);
    if (mm == null) return;
    const derivedInsertable = mm * (selectedTemplate.insertableLength / selectedTemplate.totalLength);
    setInsertableInput(formatForInput(derivedInsertable, unit));
  };

  const handleInsertableChange = (next: string) => {
    setInsertableInput(next);
    if (!selectedTemplate) return;
    const mm = parseToMm(next, unit);
    if (mm == null) return;
    const derivedTotal = mm * (selectedTemplate.totalLength / selectedTemplate.insertableLength);
    setTotalInput(formatForInput(derivedTotal, unit));
  };

  const handleSelectTemplate = (id: string) => {
    const t = TOY_TEMPLATES.find((x) => x.id === id);
    if (t) {
      setTotalInput(formatForInput(t.totalLength, unit));
      setInsertableInput(formatForInput(t.insertableLength, unit));
      const canonicalDiameter = circumferenceToDiameter(t.circumference);
      const canonicalSize = sizeMode === 'diameter' ? canonicalDiameter : t.circumference;
      if (canonicalSize != null) setSizeInput(formatForInput(canonicalSize, unit));
    }
    setSelectedId(id);
    setStep('size');
  };

  const handleContinue = () => {
    if (!selectedTemplate || totalMm == null || maxDiameterMm == null) return;
    onPick(templateToEditor({ template: selectedTemplate, totalMm, maxDiameterMm }));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <StepHeader step={step} />

      {step === 'template' ? (
        <TemplatePicker selectedId={selectedId} onSelect={handleSelectTemplate} onSkip={onSkip} />
      ) : (
        <SizeForm
          template={selectedTemplate}
          unit={unit}
          totalInput={totalInput}
          insertableInput={insertableInput}
          sizeInput={sizeInput}
          sizeMode={sizeMode}
          totalMm={totalMm}
          insertableMm={insertableMm}
          maxDiameterMm={maxDiameterMm}
          onTotalChange={handleTotalChange}
          onInsertableChange={handleInsertableChange}
          onSizeChange={setSizeInput}
          onSizeModeChange={handleSizeMode}
          onBack={() => setStep('template')}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
}

function StepHeader({ step }: Readonly<{ step: Step }>) {
  const stepNumber = step === 'template' ? 1 : 2;
  const title = step === 'template' ? TEMPLATE_PICKER_TITLE : TEMPLATE_SIZE_TITLE;
  const subtitle = step === 'template' ? TEMPLATE_PICKER_SUBTITLE : TEMPLATE_SIZE_SUBTITLE;
  return (
    <div className="border-b border-neutral-200 bg-white px-4 pt-5 pb-4 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <StepIndicator current={stepNumber} total={2} />
        <h3 className="mt-3 text-base font-semibold text-neutral-900">{title}</h3>
        <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
      </div>
    </div>
  );
}

function StepIndicator({ current, total }: Readonly<{ current: number; total: number }>) {
  return (
    <ol className="flex items-center gap-2" aria-label={templateStepAriaLabel(current, total)}>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const active = n === current;
        const done = n < current;
        return (
          <li key={n} className="flex items-center gap-2">
            <span
              className={
                'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ' +
                (done
                  ? 'bg-blue-600 text-white'
                  : active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-neutral-300 bg-white text-neutral-500')
              }
            >
              {done ? <Check size={12} strokeWidth={3} /> : n}
            </span>
            {n < total && <span className="h-px w-8 bg-neutral-300" />}
          </li>
        );
      })}
    </ol>
  );
}

type TemplatePickerProps = Readonly<{
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSkip: () => void;
}>;

function TemplatePicker({ selectedId, onSelect, onSkip }: TemplatePickerProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BlankCard onClick={onSkip} />
        {TOY_TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            selected={template.id === selectedId}
            onSelect={() => onSelect(template.id)}
          />
        ))}
      </div>
    </div>
  );
}

function BlankCard({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50/40 text-left transition-colors hover:border-blue-500 hover:bg-blue-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="flex h-44 items-center justify-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-neutral-300 text-neutral-400 transition-colors group-hover:border-blue-500 group-hover:text-blue-600">
          <Plus size={22} strokeWidth={2.2} />
        </span>
      </div>
      <div className="border-t border-neutral-200 px-3 py-2.5">
        <div className="text-sm font-semibold text-neutral-900">{TEMPLATE_BLANK_NAME}</div>
        <div className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{TEMPLATE_BLANK_DESCRIPTION}</div>
      </div>
    </button>
  );
}

type TemplateCardProps = Readonly<{
  template: ToyTemplate;
  selected: boolean;
  onSelect: () => void;
}>;

function TemplateCard({ template, selected, onSelect }: TemplateCardProps) {
  const previewToy = useMemo<EditorToy>(
    () =>
      templateToEditor({
        template,
        totalMm: template.totalLength,
        maxDiameterMm: circumferenceToDiameter(template.circumference) ?? 1,
      }),
    [template],
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ' +
        (selected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-neutral-200')
      }
    >
      <div className="relative h-44 bg-neutral-50">
        {selected && (
          <span className="absolute right-2.5 top-2.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
        <div className="absolute inset-x-0 top-2 bottom-2 flex items-end justify-center">
          <ThumbnailRender toy={previewToy} scaleFactor={1} style={PREVIEW_STYLE} />
        </div>
      </div>
      <div className="border-t border-neutral-200 px-3 py-2.5">
        <div className="text-sm font-semibold text-neutral-900">{template.name}</div>
        {template.description && (
          <div className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{template.description}</div>
        )}
      </div>
    </button>
  );
}

type SizeFormProps = Readonly<{
  template: ToyTemplate | null;
  unit: Unit;
  totalInput: string;
  insertableInput: string;
  sizeInput: string;
  sizeMode: SizeMode;
  totalMm: number | null;
  insertableMm: number | null;
  maxDiameterMm: number | null;
  onTotalChange: (v: string) => void;
  onInsertableChange: (v: string) => void;
  onSizeChange: (v: string) => void;
  onSizeModeChange: (next: SizeMode) => void;
  onBack: () => void;
  onContinue: () => void;
}>;

function SizeForm({
  template,
  unit,
  totalInput,
  insertableInput,
  sizeInput,
  sizeMode,
  totalMm,
  insertableMm,
  maxDiameterMm,
  onTotalChange,
  onInsertableChange,
  onSizeChange,
  onSizeModeChange,
  onBack,
  onContinue,
}: SizeFormProps) {
  const previewToy = useMemo<EditorToy | null>(() => {
    if (!template || totalMm == null || maxDiameterMm == null) return null;
    return templateToEditor({ template, totalMm, maxDiameterMm });
  }, [template, totalMm, maxDiameterMm]);

  const canContinue = template != null && totalMm != null && insertableMm != null && maxDiameterMm != null;
  const sizeFieldLabel = sizeMode === 'diameter' ? TEMPLATE_FIELD_MAX_DIAMETER : TEMPLATE_FIELD_CIRCUMFERENCE;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-md flex-col gap-5">
          {template && (
            <div className="text-center text-xs uppercase tracking-[0.08em] text-neutral-500">
              {TEMPLATE_PICKED_SHAPE_PREFIX} · <span className="text-neutral-700">{template.name}</span>
            </div>
          )}

          <div className="flex h-56 items-end justify-center rounded-2xl border border-neutral-200 bg-neutral-50">
            {previewToy && <ThumbnailRender toy={previewToy} scaleFactor={1} style={PREVIEW_STYLE} />}
          </div>

          <div className="flex flex-col gap-3">
            <SizeField label={TEMPLATE_FIELD_TOTAL_LENGTH} value={totalInput} onChange={onTotalChange} unit={unit} />
            <SizeField
              label={TEMPLATE_FIELD_INSERTABLE_LENGTH}
              value={insertableInput}
              onChange={onInsertableChange}
              unit={unit}
            />
            <SizeField
              label={sizeFieldLabel}
              value={sizeInput}
              onChange={onSizeChange}
              unit={unit}
              trailing={<ModeToggle value={sizeMode} onChange={onSizeModeChange} />}
            />
          </div>
        </div>
      </div>

      <footer className="flex items-center gap-2 border-t border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <Button variant="outline" size="sm" onPress={onBack}>
          <ArrowLeft size={14} strokeWidth={2} />
          {TEMPLATE_BACK}
        </Button>
        <div className="flex-1" />
        <Button variant="primary" size="sm" isDisabled={!canContinue} onPress={onContinue}>
          {TEMPLATE_CONTINUE}
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
