'use client';

import { useCallback, useMemo, useReducer } from 'react';

import {
  initialTemplateFormState,
  selectInsertableMm,
  selectMaxDiameterMm,
  selectTotalMm,
  type SizeMode,
  templateFormReducer,
  type TemplateFormState,
} from '@/services/templateForm';
import { TOY_TEMPLATES } from '@/services/toyTemplates';
import type { ToyTemplate } from '@/services/types';
import { type Unit } from '@/services/units';

/** Facade returned by `useTemplateForm`. Bundles the form state, the
 *  resolved selected template, the parsed mm targets, and named
 *  action methods so children don't have to think about the underlying
 *  reducer / action types. */
export type TemplateForm = Readonly<{
  state: TemplateFormState;
  selectedTemplate: ToyTemplate | null;
  totalMm: number | null;
  insertableMm: number | null;
  maxDiameterMm: number | null;

  selectTemplate: (template: ToyTemplate) => void;
  changeTotal: (value: string) => void;
  changeInsertable: (value: string) => void;
  changeSize: (value: string) => void;
  changeSizeMode: (mode: SizeMode) => void;
}>;

/** Wire `templateFormReducer` + selectors into a typed facade the
 *  wizard's children consume. The reducer / selectors are the
 *  business logic (pure, tested in services/templateForm.test.ts);
 *  this hook is just the React-side wiring. */
export function useTemplateForm(unit: Unit): TemplateForm {
  const [state, dispatch] = useReducer(templateFormReducer, initialTemplateFormState);

  const selectedTemplate = useMemo(
    () => (state.selectedId ? (TOY_TEMPLATES.find((t) => t.id === state.selectedId) ?? null) : null),
    [state.selectedId],
  );

  const totalMm = selectTotalMm(state, unit);
  const insertableMm = selectInsertableMm(state, unit);
  const maxDiameterMm = selectMaxDiameterMm(state, unit);

  const selectTemplate = useCallback(
    (template: ToyTemplate) => dispatch({ type: 'select-template', template, unit }),
    [unit],
  );
  const changeTotal = useCallback(
    (value: string) => dispatch({ type: 'change-total', value, selectedTemplate, unit }),
    [selectedTemplate, unit],
  );
  const changeInsertable = useCallback(
    (value: string) => dispatch({ type: 'change-insertable', value, selectedTemplate, unit }),
    [selectedTemplate, unit],
  );
  const changeSize = useCallback((value: string) => dispatch({ type: 'change-size', value }), []);
  const changeSizeMode = useCallback((mode: SizeMode) => dispatch({ type: 'change-size-mode', mode, unit }), [unit]);

  return {
    state,
    selectedTemplate,
    totalMm,
    insertableMm,
    maxDiameterMm,
    selectTemplate,
    changeTotal,
    changeInsertable,
    changeSize,
    changeSizeMode,
  };
}
