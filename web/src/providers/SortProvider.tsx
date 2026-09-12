'use client';

import { createContext, ReactNode, useContext, useMemo } from 'react';

import { usePersistedState } from '@/hooks/usePersistedState';
import { isValidSort, type Sort, type SortConfig } from '@/lib/sort';

interface SortContextValue {
  sort: Sort;
  setSort: (sort: Sort) => void;
}

const SortContext = createContext<SortContextValue | null>(null);

const sortValidator =
  (config: SortConfig) =>
  (value: unknown): value is Sort =>
    isValidSort(value, config);

export function SortProvider({ children, config }: Readonly<{ children: ReactNode; config: SortConfig }>) {
  const isValid = useMemo(() => sortValidator(config), [config]);
  const [sort, setSort] = usePersistedState<Sort>(config.storageKey, config.defaultSort, isValid);
  const value = useMemo(() => ({ sort, setSort }), [sort, setSort]);
  return <SortContext.Provider value={value}>{children}</SortContext.Provider>;
}

export function useSort(): SortContextValue {
  const ctx = useContext(SortContext);
  if (!ctx) throw new Error('useSort must be used within SortProvider');
  return ctx;
}
