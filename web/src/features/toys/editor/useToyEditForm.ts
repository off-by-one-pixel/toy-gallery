'use client';

import { useCallback, useMemo, useReducer, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToyStore } from 'toy-editor';
import type { Toy as EditorToy } from 'toy-editor';

import { useToys } from '@/features/toys/useToys';
import type { EditorState } from '@/features/toys/converters/editor';
import { editorStateFromToy, editorToTemplateJson, isEditorStateEqual } from '@/features/toys/converters/editor';
import { toyToEditor } from '@/features/toys/converters/toy';
import {
  identityReducer,
  initialIdentity,
  isIdentityEqual,
  type ToyEditMode,
  type ToyIdentity,
  validateAndBuildPayload,
} from '@/features/toys/editor/toyEditForm';
import { DEFAULT_FILL } from '@/features/toys/editor/constants';

export type ToyEditForm = Readonly<{
  identity: ToyIdentity;
  setIdentityField: (field: keyof ToyIdentity, value: string) => void;

  initialToy: EditorToy | null;
  setPickedInitial: (next: EditorToy) => void;

  editorState: EditorState;
  hydrate: (toy: EditorToy) => void;
  exportText: string;

  dirty: boolean;
  saving: boolean;
  error: string | null;
  save: (mode: ToyEditMode, onSuccess: () => void) => Promise<void>;
}>;

export function useToyEditForm(mode: ToyEditMode): ToyEditForm {
  const source = mode.kind === 'new' ? null : mode.toy;

  const seedIdentity = useMemo(() => initialIdentity(source, DEFAULT_FILL), [source]);
  const [identity, dispatch] = useReducer(identityReducer, seedIdentity);
  const setIdentityField = useCallback((field: keyof ToyIdentity, value: string) => dispatch({ field, value }), []);

  const sourceInitial = useMemo<EditorToy | null>(() => (source ? toyToEditor(source) : null), [source]);
  const [pickedInitial, setPickedInitial] = useState<EditorToy | null>(null);
  const initialToy: EditorToy | null = sourceInitial ?? pickedInitial;

  const sections = useToyStore((s) => s.sections);
  const topShape = useToyStore((s) => s.topShape);
  const bottomShape = useToyStore((s) => s.bottomShape);
  const insertableLengthMm = useToyStore((s) => s.insertableLengthMm);
  const knownTotalMm = useToyStore((s) => s.knownTotalMm);
  const knownSizeMm = useToyStore((s) => s.knownSizeMm);
  const hydrate = useToyStore((s) => s.hydrate);

  const editorState: EditorState = {
    sections,
    topShape,
    bottomShape,
    insertableLengthMm,
    knownTotalMm,
    knownSizeMm,
  };

  const exportText = useMemo(
    () => editorToTemplateJson(editorState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sections, topShape, bottomShape, insertableLengthMm, knownTotalMm, knownSizeMm],
  );

  const identityDirty = !isIdentityEqual(identity, seedIdentity);
  const editorDirty = initialToy !== null && !isEditorStateEqual(editorState, editorStateFromToy(initialToy));
  const dirty = identityDirty || editorDirty;

  const t = useTranslations('toyEdit.validation');
  const [error, setError] = useState<string | null>(null);
  const { saveToy, isSavingToy } = useToys({ saveErrorSink: setError });

  const save = useCallback(
    async (saveMode: ToyEditMode, onSuccess: () => void) => {
      setError(null);
      const result = validateAndBuildPayload(identity, editorState, saveMode);
      if (!result.ok) {
        setError(t(result.error));
        return;
      }
      const saved = await saveToy({
        toyId: saveMode.kind === 'edit' ? saveMode.toy.id : null,
        payload: result.payload,
      });
      if (saved) onSuccess();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [identity, sections, topShape, bottomShape, insertableLengthMm, knownTotalMm, knownSizeMm, saveToy, t],
  );

  return {
    identity,
    setIdentityField,
    initialToy,
    setPickedInitial,
    editorState,
    hydrate,
    exportText,
    dirty,
    saving: isSavingToy,
    error,
    save,
  };
}
