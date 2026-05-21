import type { Toy as EditorToy } from 'toy-editor';

import { templateToEditor } from './converters/template';
import type { ToyTemplate } from './types';
import { circumferenceToDiameter, diameterToCircumference, fromMm, toMm, type Unit } from './units';

export type SizeMode = 'diameter' | 'circumference';

/** All the form state for the "set the dimensions" step. Input strings
 *  match the user's display unit; conversions to mm happen at the
 *  boundary via the selectors below. */
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

// -------- Pure parse / format helpers --------

/** Format an mm value for display in the chosen unit, rounded to that
 *  unit's display precision. */
export function formatForInput(mm: number, unit: Unit): string {
  return fromMm(mm, unit).toFixed(unit.decimals);
}

/** Parse a raw input string as a positive finite number. Tolerates a
 *  comma as a decimal separator. Returns `null` for empty / invalid /
 *  non-positive values. */
export function parseInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const v = Number(trimmed.replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** Parse a raw input string in the given unit, returning the value in
 *  mm. Returns `null` when `parseInput` would. */
export function parseToMm(raw: string, unit: Unit): number | null {
  const v = parseInput(raw);
  return v == null ? null : toMm(v, unit);
}

// -------- Selectors: form state → target dimensions in mm --------

/** Total length in mm derived from the input. */
export function selectTotalMm(state: TemplateFormState, unit: Unit): number | null {
  return parseToMm(state.totalInput, unit);
}

/** Insertable length in mm derived from the input. */
export function selectInsertableMm(state: TemplateFormState, unit: Unit): number | null {
  return parseToMm(state.insertableInput, unit);
}

/** Max diameter in mm — the size input read as diameter, or converted
 *  from circumference via π depending on the size mode. */
export function selectMaxDiameterMm(state: TemplateFormState, unit: Unit): number | null {
  const inputMm = parseToMm(state.sizeInput, unit);
  if (inputMm == null) return null;
  return state.sizeMode === 'diameter' ? inputMm : circumferenceToDiameter(inputMm);
}

// -------- Pure helpers needed by the reducer --------

/** Canonical preview EditorToy at the template's authored dimensions —
 *  what the picker cards render. */
export function templatePreviewToy(template: ToyTemplate): EditorToy {
  return templateToEditor({
    template,
    totalMm: template.totalLength,
    maxDiameterMm: circumferenceToDiameter(template.circumference) ?? 1,
  });
}

/** Returns the canonical size value (diameter or circumference) the
 *  size input should hold when `template` is freshly selected with the
 *  given mode. */
function templateCanonicalSizeMm(template: ToyTemplate, mode: SizeMode): number | null {
  return mode === 'diameter' ? circumferenceToDiameter(template.circumference) : template.circumference;
}

/** Convert a typed size string between the two modes (Ø ↔ C) via π. */
function convertSizeBetweenModes(sizeInput: string, from: SizeMode, to: SizeMode, unit: Unit): string {
  if (from === to) return sizeInput;
  const mm = parseToMm(sizeInput, unit);
  if (mm == null) return sizeInput;
  const converted = to === 'diameter' ? circumferenceToDiameter(mm) : diameterToCircumference(mm);
  return converted == null ? sizeInput : formatForInput(converted, unit);
}

// -------- Reducer --------

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
