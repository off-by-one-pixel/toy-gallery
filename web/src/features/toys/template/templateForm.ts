import type { Toy as EditorToy } from 'toy-editor';

import { templateToEditor } from '@/features/toys/converters/template';
import type { ToyTemplate } from '@/api/types';
import {
  circumferenceToDiameter,
  diameterToCircumference,
  formatForInput,
  parseToMm,
  type Unit,
} from '@/features/preferences/units';

export type SizeMode = 'diameter' | 'circumference';

export type TemplateFormState = Readonly<{
  selectedId: string | null;
  totalInput: string;
  insertableInput: string;
  sizeMode: SizeMode;
  sizeInput: string;
}>;

export const initialTemplateFormState: TemplateFormState = {
  selectedId: null,
  totalInput: '',
  insertableInput: '',
  sizeMode: 'diameter',
  sizeInput: '',
};

export function selectTotalMm(state: TemplateFormState, unit: Unit): number | null {
  return parseToMm(state.totalInput, unit);
}

export function selectInsertableMm(state: TemplateFormState, unit: Unit): number | null {
  return parseToMm(state.insertableInput, unit);
}

export function selectMaxDiameterMm(state: TemplateFormState, unit: Unit): number | null {
  const inputMm = parseToMm(state.sizeInput, unit);
  if (inputMm == null) return null;
  return state.sizeMode === 'diameter' ? inputMm : circumferenceToDiameter(inputMm);
}

export function templatePreviewToy(template: ToyTemplate): EditorToy {
  return templateToEditor({
    template,
    totalMm: template.totalLength,
    maxDiameterMm: circumferenceToDiameter(template.circumference) ?? 1,
  });
}

function templateCanonicalSizeMm(template: ToyTemplate, mode: SizeMode): number | null {
  return mode === 'diameter' ? circumferenceToDiameter(template.circumference) : template.circumference;
}

function convertSizeBetweenModes(sizeInput: string, from: SizeMode, to: SizeMode, unit: Unit): string {
  if (from === to) return sizeInput;
  const mm = parseToMm(sizeInput, unit);
  if (mm == null) return sizeInput;
  const converted = to === 'diameter' ? circumferenceToDiameter(mm) : diameterToCircumference(mm);
  return converted == null ? sizeInput : formatForInput(converted, unit);
}

export type TemplateFormAction =
  | Readonly<{ type: 'select-template'; template: ToyTemplate; unit: Unit }>
  | Readonly<{ type: 'change-total'; value: string; selectedTemplate: ToyTemplate | null; unit: Unit }>
  | Readonly<{ type: 'change-insertable'; value: string; selectedTemplate: ToyTemplate | null; unit: Unit }>
  | Readonly<{ type: 'change-size'; value: string }>
  | Readonly<{ type: 'change-size-mode'; mode: SizeMode; unit: Unit }>;

export function templateFormReducer(state: TemplateFormState, action: TemplateFormAction): TemplateFormState {
  switch (action.type) {
    case 'select-template': {
      const { template, unit } = action;
      const canonicalSize = templateCanonicalSizeMm(template, state.sizeMode);
      return {
        ...state,
        selectedId: template.id,
        totalInput: formatForInput(template.totalLength, unit),
        insertableInput: formatForInput(template.insertableLength, unit),
        sizeInput: canonicalSize == null ? state.sizeInput : formatForInput(canonicalSize, unit),
      };
    }
    case 'change-total': {
      const { value, selectedTemplate, unit } = action;
      if (!selectedTemplate) return { ...state, totalInput: value };
      const mm = parseToMm(value, unit);
      if (mm == null) return { ...state, totalInput: value };
      const ratio = selectedTemplate.insertableLength / selectedTemplate.totalLength;
      return {
        ...state,
        totalInput: value,
        insertableInput: formatForInput(mm * ratio, unit),
      };
    }
    case 'change-insertable': {
      const { value, selectedTemplate, unit } = action;
      if (!selectedTemplate) return { ...state, insertableInput: value };
      const mm = parseToMm(value, unit);
      if (mm == null) return { ...state, insertableInput: value };
      const ratio = selectedTemplate.totalLength / selectedTemplate.insertableLength;
      return {
        ...state,
        insertableInput: value,
        totalInput: formatForInput(mm * ratio, unit),
      };
    }
    case 'change-size':
      return { ...state, sizeInput: action.value };
    case 'change-size-mode': {
      const { mode, unit } = action;
      if (mode === state.sizeMode) return state;
      return {
        ...state,
        sizeMode: mode,
        sizeInput: convertSizeBetweenModes(state.sizeInput, state.sizeMode, mode, unit),
      };
    }
  }
}
