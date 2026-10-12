'use client';

import { Button } from '@heroui/react';
import { ThumbnailRender } from 'toy-editor';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { SizeMode } from '@/features/toys/template/templateForm';
import { useUnit } from '@/features/preferences/useUnit';
import UnitField from '@/features/preferences/UnitField';
import { PREVIEW_STYLE } from '@/features/toys/template/styles';
import type { useTemplateForm } from '@/features/toys/template/useTemplateForm';

type Props = Readonly<{
  form: ReturnType<typeof useTemplateForm>;
  onBack: () => void;
  onContinue: () => void;
}>;

export default function SizeForm({ form, onBack, onContinue }: Props) {
  const { unit } = useUnit();
  const t = useTranslations('template');
  const common = useTranslations('common');
  const { state, selectedTemplate: template, previewToy } = form;
  const canContinue = previewToy != null && form.insertableMm != null;
  const sizeFieldLabel = state.sizeMode === 'diameter' ? t('fieldMaxDiameter') : common('circumference');

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-md flex-col gap-5">
          {template && (
            <div className="text-center text-xs uppercase tracking-[0.08em] text-muted">
              {t('pickedShapePrefix')} · <span className="text-foreground">{template.name}</span>
            </div>
          )}

          <div className="flex h-56 items-end justify-center rounded-2xl border border-border bg-surface-secondary">
            {previewToy && <ThumbnailRender toy={previewToy} scaleFactor={1} style={PREVIEW_STYLE} />}
          </div>

          <div className="flex flex-col gap-3">
            <UnitField label={common('totalLength')} value={state.totalInput} onChange={form.changeTotal} unit={unit} />
            <UnitField
              label={t('fieldInsertableLength')}
              value={state.insertableInput}
              onChange={form.changeInsertable}
              unit={unit}
            />
            <UnitField
              label={sizeFieldLabel}
              value={state.sizeInput}
              onChange={form.changeSize}
              unit={unit}
              trailing={<ModeToggle value={state.sizeMode} onChange={form.changeSizeMode} />}
            />
          </div>
        </div>
      </div>

      <footer className="flex items-center gap-2 border-t border-border bg-surface px-4 py-3 sm:px-6">
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

type ModeToggleProps = Readonly<{
  value: SizeMode;
  onChange: (next: SizeMode) => void;
}>;

function ModeToggle({ value, onChange }: ModeToggleProps) {
  const t = useTranslations('template.girthMode');
  return (
    <span className="inline-flex rounded-md border border-border bg-surface-secondary p-0.5">
      {(['diameter', 'circumference'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={
            'rounded px-2 py-0.5 text-caption font-medium transition-colors ' +
            (value === m ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground')
          }
        >
          {t(m)}
        </button>
      ))}
    </span>
  );
}
