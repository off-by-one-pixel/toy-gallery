import { useCallback, useEffect, useRef, useState } from 'react';

import { patchToy } from '../services/api';
import { newRow, reconcileRows, sameDict, toDict, toRows } from '../services/attributesEditor';
import type { AttributeRow, Toy } from '../services/types';
import { useReportError } from './useAsyncAction';

export interface AttributesEditor {
  rows: AttributeRow[];
  updateKey: (rowId: number, key: string) => void;
  updateValue: (rowId: number, value: string) => void;
  removeRow: (rowId: number) => void;
  addRow: () => void;
  /** Commit any unsaved edits. Call from input onBlur. */
  commitChanges: () => void;
}

/**
 * Stateful editor for a toy's `customAttributes`. Owns the local draft and
 * persists it to the server only on explicit commit (typically input blur),
 * not while the user is still typing. Single-flight save with one queued
 * retry; re-hydrates from the server's response so the BE remains the
 * source of truth.
 */
export function useAttributesEditor(toy: Toy): AttributesEditor {
  // Per-instance row id counter — used as React keys, must be stable
  // across renders for the same logical row.
  const nextRowId = useRef(0);
  const freshRowId = useCallback(() => ++nextRowId.current, []);

  const initial = toy.customAttributes ?? {};
  const [rows, setRows] = useState<AttributeRow[]>(() => toRows(initial, freshRowId));

  const rowsRef = useRef(rows);
  const savedRef = useRef<Record<string, string>>(initial);
  const reportError = useReportError();

  const inFlight = useRef(false);
  const pending = useRef(false);

  // Mutators write to both state and ref so the next commit reads the
  // latest value even if React hasn't flushed the render yet (typical case
  // when blur fires immediately after onChange).
  const setRowsSync = (update: AttributeRow[] | ((prev: AttributeRow[]) => AttributeRow[])): void => {
    const next = typeof update === 'function' ? update(rowsRef.current) : update;
    rowsRef.current = next;
    setRows(next);
  };

  // ---------- Save pipeline ----------

  const hasUnsavedChanges = (): boolean => !sameDict(toDict(rowsRef.current), savedRef.current);

  const applyServerResponse = (fresh: Record<string, string>): void => {
    savedRef.current = fresh;
    setRowsSync((rs) => reconcileRows(rs, fresh, freshRowId));
  };

  const revertToLastSaved = (): void => {
    setRowsSync(toRows(savedRef.current, freshRowId));
  };

  const commitSave = async (): Promise<void> => {
    if (!hasUnsavedChanges()) return;
    if (inFlight.current) {
      pending.current = true;
      return;
    }
    inFlight.current = true;
    try {
      const updated = await patchToy(toy.id, {
        customAttributes: toDict(rowsRef.current),
      });
      applyServerResponse(updated.customAttributes ?? {});
    } catch (err) {
      revertToLastSaved();
      reportError(err);
    } finally {
      inFlight.current = false;
      if (pending.current) {
        pending.current = false;
        void commitSave();
      }
    }
  };

  // ---------- Lifecycle ----------

  const hydrateFromToy = (): void => {
    const fresh = toy.customAttributes ?? {};
    savedRef.current = fresh;
    setRowsSync(toRows(fresh, freshRowId));
  };

  // Re-hydrate when the parent swaps in a different toy. Same-id re-renders
  // don't touch in-progress edits.
  const lastId = useRef(toy.id);
  useEffect(() => {
    if (lastId.current === toy.id) return;
    lastId.current = toy.id;
    hydrateFromToy();
  }, [toy.id, toy.customAttributes]);

  // Flush any unsaved edits on unmount, in case the input never blurred
  // (e.g., the panel was removed while an input was still focused).
  useEffect(() => {
    return () => {
      void commitSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- User actions ----------

  const mutateRow = (rowId: number, change: (r: AttributeRow) => AttributeRow): void => {
    setRowsSync((rs) => rs.map((r) => (r.rowId === rowId ? change(r) : r)));
  };

  return {
    rows,
    updateKey: (rowId, key) => mutateRow(rowId, (r) => ({ ...r, key })),
    updateValue: (rowId, value) => mutateRow(rowId, (r) => ({ ...r, value })),
    removeRow: (rowId) => {
      setRowsSync((rs) => rs.filter((r) => r.rowId !== rowId));
      void commitSave();
    },
    addRow: () => {
      setRowsSync((rs) => [...rs, newRow(freshRowId)]);
    },
    commitChanges: () => {
      void commitSave();
    },
  };
}
