import type { AttributeRow } from '@/api/types';

let lastRowId = 0;
const nextRowId = () => ++lastRowId;

export function toRows(attrs: Record<string, string> | undefined): AttributeRow[] {
  return Object.entries(attrs ?? {}).map(([key, value]) => ({
    rowId: nextRowId(),
    key,
    value,
    fromSaved: true,
  }));
}

export function isRowReady(row: AttributeRow): boolean {
  return row.key.trim() !== '' && (row.fromSaved || row.value !== '');
}

export function toDict(rows: readonly AttributeRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (isRowReady(row)) out[row.key.trim()] = row.value;
  }
  return out;
}

export function sameDict(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  return ak.every((k) => a[k] === b[k]);
}

export function reconcileRows(current: readonly AttributeRow[], serverDict: Record<string, string>): AttributeRow[] {
  const byKey = new Map(current.filter((r) => r.fromSaved).map((r) => [r.key.trim(), r] as const));
  const out: AttributeRow[] = [];
  for (const [key, value] of Object.entries(serverDict)) {
    const existing = byKey.get(key);
    out.push({ rowId: existing?.rowId ?? nextRowId(), key, value, fromSaved: true });
  }
  for (const r of current) {
    if (!r.fromSaved && serverDict[r.key.trim()] === undefined) out.push(r);
  }
  return out;
}

export function newRow(): AttributeRow {
  return { rowId: nextRowId(), key: '', value: '', fromSaved: false };
}
