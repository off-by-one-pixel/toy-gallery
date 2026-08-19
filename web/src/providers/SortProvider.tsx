'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { isSortColumn, type Sort } from '../services/sort';

const DEFAULT_STORAGE_KEY = 'gallery.sort';

interface SortContextValue {
  sort: Sort | null;
  setSort: (sort: Sort | null) => void;
}

const SortContext = createContext<SortContextValue | null>(null);

const isValidSort = (v: unknown, columns?: readonly string[]): v is Sort => {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as { column?: unknown; direction?: unknown };
  const columnOk = columns ? typeof s.column === 'string' && columns.includes(s.column) : isSortColumn(s.column);
  return columnOk && (s.direction === 'asc' || s.direction === 'desc');
};

export function SortProvider({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
  columns,
}: Readonly<{ children: ReactNode; storageKey?: string; columns?: readonly string[] }>) {
  const [sortState, setSortState] = useState<Sort | null>(null);

  useEffect(() => {
    if (globalThis.window === undefined) return;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (isValidSort(parsed, columns)) setSortState(parsed);
    } catch {
      // ignore corrupt value
    }
  }, [storageKey, columns]);

  const setSort = useCallback(
    (next: Sort | null) => {
      setSortState(next);
      if (globalThis.window === undefined) return;
      if (next) localStorage.setItem(storageKey, JSON.stringify(next));
      else localStorage.removeItem(storageKey);
    },
    [storageKey],
  );

  const value = useMemo(() => ({ sort: sortState, setSort }), [sortState, setSort]);

  return <SortContext.Provider value={value}>{children}</SortContext.Provider>;
}

export function useSort(): SortContextValue {
  const ctx = useContext(SortContext);
  if (!ctx) throw new Error('useSort must be used within SortProvider');
  return ctx;
}
