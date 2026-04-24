import { useEffect, useRef, useState } from 'react';

import { patchToy } from '../services/api';
import type { AttributeRow, Toy } from '../services/types';
import { useReportError } from './useAsyncAction';

// ---------- Pure row/dict helpers ----------

let nextRowId = 0;
const freshRowId = (): number => ++nextRowId;

const toRows = (attrs: Record<string, string> | undefined): AttributeRow[] =>
  Object.entries(attrs ?? {}).map(([key, value]) => ({
    rowId: freshRowId(),
    key,
    value,
    fromSaved: true,
  }));

/** A row is ready to be sent to the server when it has a non-empty key
 *  AND either originated on the server (so clearing the value is a valid
 *  edit) or has a non-empty value (so a half-typed new row stays draft). */
const isRowReady = (row: AttributeRow): boolean =>
  row.key.trim() !== '' && (row.fromSaved || row.value !== '');

const toDict = (rows: AttributeRow[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (isRowReady(row)) out[row.key.trim()] = row.value;
  }
  return out;
};

const sameDict = (a: Record<string, string>, b: Record<string, string>): boolean => {
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  return ak.every((k) => a[k] === b[k]);
};

/** Mirror server state in the UI rows. Reuses rowIds for keys that survived
 *  (so React doesn't unmount inputs the user is still editing), then appends
 *  any user-added rows whose key isn't yet on the server. */
const reconcileRows = (
  current: AttributeRow[],
  serverDict: Record<string, string>,
): AttributeRow[] => {
  const byKey = new Map(
    current.filter((r) => r.fromSaved).map((r) => [r.key.trim(), r] as const),
  );
  const out: AttributeRow[] = [];
  for (const [key, value] of Object.entries(serverDict)) {
    const existing = byKey.get(key);
    out.push({ rowId: existing?.rowId ?? freshRowId(), key, value, fromSaved: true });
  }
  for (const r of current) {
    if (!r.fromSaved && serverDict[r.key.trim()] === undefined) out.push(r);
  }
  return out;
};

const newRow = (): AttributeRow => ({
  rowId: freshRowId(),
  key: '',
  value: '',
  fromSaved: false,
});

// ---------- Hook ----------

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
  const initial = toy.customAttributes ?? {};
  const [rows, setRows] = useState<AttributeRow[]>(() => toRows(initial));

  const rowsRef = useRef(rows);
  const savedRef = useRef<Record<string, string>>(initial);
  const reportError = useReportError();

  const inFlight = useRef(false);
  const pending = useRef(false);

  // Mutators write to both state and ref so the next commit reads the
  // latest value even if React hasn't flushed the render yet (typical case
  // when blur fires immediately after onChange).
  const setRowsSync = (
    update: AttributeRow[] | ((prev: AttributeRow[]) => AttributeRow[]),
  ): void => {
    const next = typeof update === 'function' ? update(rowsRef.current) : update;
    rowsRef.current = next;
    setRows(next);
  };

  // ---------- Save pipeline ----------

  const hasUnsavedChanges = (): boolean =>
    !sameDict(toDict(rowsRef.current), savedRef.current);

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
    setRowsSync(toRows(fresh));
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
      setRowsSync((rs) => [...rs, newRow()]);
    },
    commitChanges: () => {
      void commitSave();
    },
  };
}
