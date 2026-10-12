'use client';

import { useMemo, useReducer } from 'react';

import { templateToEditor } from '@/features/toys/converters/template';
import {
  initialTemplateFormState,
  selectMaxDiameterMm,
  type SizeMode,
  templateById,
  templateFormReducer,
} from '@/features/toys/template/templateForm';
import { parseToMm, type Unit } from '@/features/preferences/units';

export function useTemplateForm(unit: Unit) {
  const [state, dispatch] = useReducer(templateFormReducer, initialTemplateFormState);
  const selectedTemplate = templateById(state.selectedId);
  const totalMm = parseToMm(state.totalInput, unit);
  const maxDiameterMm = selectMaxDiameterMm(state, unit);

  const previewToy = useMemo(
    () =>
      selectedTemplate && totalMm != null && maxDiameterMm != null
        ? templateToEditor({ template: selectedTemplate, totalMm, maxDiameterMm })
        : null,
    [selectedTemplate, totalMm, maxDiameterMm],
  );

  return {
    state,
    selectedTemplate,
    insertableMm: parseToMm(state.insertableInput, unit),
    previewToy,
    selectTemplate: (id: string) => dispatch({ type: 'select-template', id, unit }),
    changeTotal: (value: string) => dispatch({ type: 'change-length', field: 'totalInput', value, unit }),
    changeInsertable: (value: string) => dispatch({ type: 'change-length', field: 'insertableInput', value, unit }),
    changeSize: (value: string) => dispatch({ type: 'change-size', value }),
    changeSizeMode: (mode: SizeMode) => dispatch({ type: 'change-size-mode', mode, unit }),
  };
}
