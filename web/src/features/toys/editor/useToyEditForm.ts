'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useEditorSnapshot, useToyStore } from 'toy-editor';
import type { Toy as EditorToy } from 'toy-editor';

import { useToys } from '@/features/toys/useToys';
import type { EditorState } from '@/features/toys/converters/editor';
import { editorToTemplateJson, isEditorStateEqual } from '@/features/toys/converters/editor';
import { toyToEditor } from '@/features/toys/converters/toy';
import {
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
  const [identity, setIdentity] = useState(seedIdentity);
  const setIdentityField = useCallback(
    (field: keyof ToyIdentity, value: string) => setIdentity((current) => ({ ...current, [field]: value })),
    [],
  );

  const sourceInitial = useMemo<EditorToy | null>(() => (source ? toyToEditor(source) : null), [source]);
  const [pickedInitial, setPickedInitial] = useState<EditorToy | null>(null);
  const initialToy: EditorToy | null = sourceInitial ?? pickedInitial;

  const editorState = useEditorSnapshot();
  const hydrate = useToyStore((s) => s.hydrate);
  const exportText = useMemo(() => editorToTemplateJson(editorState), [editorState]);

  const identityDirty = !isIdentityEqual(identity, seedIdentity);
  const editorDirty = initialToy !== null && !isEditorStateEqual(editorState, initialToy);
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
    [identity, editorState, saveToy, t],
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
