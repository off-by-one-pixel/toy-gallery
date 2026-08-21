'use client';

import { useCallback, useMemo, useReducer, useState } from 'react';
import { useToyStore } from 'toy-editor';
import type { Toy as EditorToy } from 'toy-editor';

import { useAsyncAction } from '@/hooks/useAsyncAction';
import { createToy, patchToy } from '@/api';
import type { EditorState } from '@/features/toys/converters/editor';
import { editorToTemplateJson } from '@/features/toys/converters/editor';
import { toyToEditor } from '@/features/toys/converters/toy';
import {
  identityReducer,
  initialIdentity,
  type ToyEditMode,
  type ToyIdentity,
  validateAndBuildPayload,
} from '@/features/toys/editor/toyEditForm';
import { DEFAULT_FILL } from '@/features/toys/editor/constants';

export type ToyEditForm = Readonly<{
  identity: ToyIdentity;
  setIdentityField: (field: keyof ToyIdentity, value: string) => void;

  /** Seed for the editor on first hydrate: the source toy on edit/copy
   *  or the last template / blank / imported toy the user picked. */
  initialToy: EditorToy | null;
  setPickedInitial: (next: EditorToy) => void;

  editorState: EditorState;
  hydrate: (toy: EditorToy) => void;
  exportText: string;

  saving: boolean;
  error: string | null;
  /** Validates + assembles + POSTs / PATCHes. Calls `onSuccess`
   *  exactly once on a 2xx response. */
  save: (mode: ToyEditMode, onSuccess: () => void) => Promise<void>;
}>;

/** Facade for the toy edit modal. Wraps the identity reducer, the
 *  toy-editor store reads, the picked-initial transient state, and
 *  the save flow into one object so children take a single `form`
 *  prop instead of a dozen. */
export function useToyEditForm(mode: ToyEditMode): ToyEditForm {
  const source = mode.kind === 'new' ? null : mode.toy;

  const [identity, dispatch] = useReducer(identityReducer, source, (s) => initialIdentity(s, DEFAULT_FILL));
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
    // editorState is rebuilt every render; the underlying store fields
    // are the real dependency set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sections, topShape, bottomShape, insertableLengthMm, knownTotalMm, knownSizeMm],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runAction = useAsyncAction(setError);

  const save = useCallback(
    async (saveMode: ToyEditMode, onSuccess: () => void) => {
      setError(null);
      const result = validateAndBuildPayload(identity, editorState, saveMode);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await runAction(
        async () => {
          if (saveMode.kind === 'edit') await patchToy(saveMode.toy.id, result.payload);
          else await createToy(result.payload);
        },
        { busy: setSaving, onSuccess },
      );
    },
    // editorState pulls from the store reads above; tracking those
    // captures any change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [identity, sections, topShape, bottomShape, insertableLengthMm, knownTotalMm, knownSizeMm, runAction],
  );

  return {
    identity,
    setIdentityField,
    initialToy,
    setPickedInitial,
    editorState,
    hydrate,
    exportText,
    saving,
    error,
    save,
  };
}
