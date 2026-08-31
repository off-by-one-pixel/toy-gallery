import type { AttributeRow, AttributeSuggestion } from '@/api/types';

/** Returns a fresh row id on each call. The hook supplies a
 *  per-instance counter (via `useRef`) so test setups are isolated. */
export type IdFactory = () => number;

/** Hydrate UI rows from a server-supplied attribute dictionary. */
export function toRows(attrs: Record<string, string> | undefined, idFactory: IdFactory): AttributeRow[] {
  return Object.entries(attrs ?? {}).map(([key, value]) => ({
    rowId: idFactory(),
    key,
    value,
    fromSaved: true,
  }));
}

/** A row is ready to be sent to the server when it has a non-empty
 *  key AND either originated on the server (so clearing the value is
 *  a valid edit) or has a non-empty value (so a half-typed new row
 *  stays draft). */
export function isRowReady(row: AttributeRow): boolean {
  return row.key.trim() !== '' && (row.fromSaved || row.value !== '');
}

/** Project the editor rows into a server-shaped attribute dictionary. */
export function toDict(rows: readonly AttributeRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (isRowReady(row)) out[row.key.trim()] = row.value;
  }
  return out;
}

export type AttributeSuggestions = {
  keys: readonly string[];
  valuesByKey: ReadonlyMap<string, readonly string[]>;
};

export const NO_SUGGESTIONS: AttributeSuggestions = { keys: [], valuesByKey: new Map() };

export function toAttributeSuggestions(entries: readonly AttributeSuggestion[]): AttributeSuggestions {
  return {
    keys: entries.map((entry) => entry.key),
    valuesByKey: new Map(entries.map((entry) => [entry.key.toLowerCase(), entry.values])),
  };
}

export function suggestedValues(suggestions: AttributeSuggestions, key: string): readonly string[] {
  return suggestions.valuesByKey.get(key.trim().toLowerCase()) ?? [];
}

/** Shallow equality on string-keyed string-valued dictionaries. */
export function sameDict(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  return ak.every((k) => a[k] === b[k]);
}

/** Mirror server state in the UI rows. Reuses rowIds for keys that
 *  survived (so React doesn't unmount inputs the user is still
 *  editing), then appends any user-added rows whose key isn't yet on
 *  the server. */
export function reconcileRows(
  current: readonly AttributeRow[],
  serverDict: Record<string, string>,
  idFactory: IdFactory,
): AttributeRow[] {
  const byKey = new Map(current.filter((r) => r.fromSaved).map((r) => [r.key.trim(), r] as const));
  const out: AttributeRow[] = [];
  for (const [key, value] of Object.entries(serverDict)) {
    const existing = byKey.get(key);
    out.push({ rowId: existing?.rowId ?? idFactory(), key, value, fromSaved: true });
  }
  for (const r of current) {
    if (!r.fromSaved && serverDict[r.key.trim()] === undefined) out.push(r);
  }
  return out;
}

/** Factory for a fresh blank row (a user just clicked "+"). */
export function newRow(idFactory: IdFactory): AttributeRow {
  return { rowId: idFactory(), key: '', value: '', fromSaved: false };
}
