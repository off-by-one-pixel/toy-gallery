import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';

import { newRow, reconcileRows, sameDict, toDict, toRows } from '@/features/toys/gallery/attributesEditor';
import { useAttributeSuggestions } from '@/features/toys/gallery/useAttributeSuggestions';
import type { AttributeRow, Toy } from '@/api/types';
import { useToys } from '@/features/toys/useToys';

export type AttributeSaveState = 'idle' | 'saving' | 'saved';

export function useAttributesEditor(toy: Toy) {
  const initial = toy.customAttributes ?? {};
  const [rows, setRows] = useState<AttributeRow[]>(() => toRows(initial));

  const [saveState, setSaveState] = useState<AttributeSaveState>('idle');
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rowsRef = useRef(rows);
  const savedRef = useRef<Record<string, string>>(initial);
  const { updateToy } = useToys();
  const [editing, setEditing] = useState(false);
  const beginEditing = useCallback(() => setEditing(true), []);
  const { keySuggestions, valuesFor, invalidateSuggestions } = useAttributeSuggestions(editing);

  const inFlight = useRef(false);
  const pending = useRef(false);

  const setRowsSync = (update: AttributeRow[] | ((prev: AttributeRow[]) => AttributeRow[])): void => {
    const next = typeof update === 'function' ? update(rowsRef.current) : update;
    rowsRef.current = next;
    setRows(next);
  };

  const hasUnsavedChanges = (): boolean => !sameDict(toDict(rowsRef.current), savedRef.current);

  const applyServerResponse = (fresh: Record<string, string>): void => {
    savedRef.current = fresh;
    setRowsSync((rs) => reconcileRows(rs, fresh));
  };

  const revertToLastSaved = (): void => {
    setRowsSync(toRows(savedRef.current));
  };

  const commitSave = async (): Promise<void> => {
    if (!hasUnsavedChanges()) return;
    if (inFlight.current) {
      pending.current = true;
      return;
    }
    inFlight.current = true;
    setSaveState('saving');
    const updated = await updateToy({ toyId: toy.id, changes: { customAttributes: toDict(rowsRef.current) } });
    if (updated) {
      applyServerResponse(updated.customAttributes ?? {});
      invalidateSuggestions();
      setSaveState('saved');
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState('idle'), 2000);
    } else {
      revertToLastSaved();
      setSaveState('idle');
    }
    inFlight.current = false;
    if (pending.current) {
      pending.current = false;
      void commitSave();
    }
  };

  const hydrateFromToy = useEffectEvent(() => {
    const fresh = toy.customAttributes ?? {};
    savedRef.current = fresh;
    setRowsSync(toRows(fresh));
  });

  const lastId = useRef(toy.id);
  useEffect(() => {
    if (lastId.current === toy.id) return;
    lastId.current = toy.id;
    hydrateFromToy();
  }, [toy.id]);

  const flushOnUnmount = useEffectEvent(() => {
    clearTimeout(savedTimer.current);
    void commitSave();
  });

  useEffect(() => {
    return () => flushOnUnmount();
  }, []);

  const mutateRow = (rowId: number, change: (r: AttributeRow) => AttributeRow): void => {
    setRowsSync((rs) => rs.map((r) => (r.rowId === rowId ? change(r) : r)));
  };

  return {
    rows,
    saveState,
    keySuggestions,
    valuesFor,
    beginEditing,
    updateKey: (rowId: number, key: string) => mutateRow(rowId, (r) => ({ ...r, key })),
    updateValue: (rowId: number, value: string) => mutateRow(rowId, (r) => ({ ...r, value })),
    removeRow: (rowId: number) => {
      setRowsSync((rs) => rs.filter((r) => r.rowId !== rowId));
      void commitSave();
    },
    addRow: () => {
      setRowsSync((rs) => [...rs, newRow()]);
    },
    commitChanges: () => {
      void commitSave();
    },
  };
}
