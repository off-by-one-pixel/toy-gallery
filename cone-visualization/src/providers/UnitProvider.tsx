'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Unit, defaultUnit, unitById } from '../services/units';

const STORAGE_KEY = 'units';

interface UnitContextValue {
  unit: Unit;
  setUnit: (unit: Unit) => void;
}

const UnitContext = createContext<UnitContextValue | null>(null);

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unitState, setUnitState] = useState<Unit>(defaultUnit);

  useEffect(() => {
    const stored = globalThis.window !== undefined ? localStorage.getItem(STORAGE_KEY) : null;
    const restored = stored ? unitById(stored) : undefined;
    if (restored) setUnitState(restored);
  }, []);

  const setUnit = useCallback((next: Unit) => {
    setUnitState(next);
    if (globalThis.window !== undefined) localStorage.setItem(STORAGE_KEY, next.id);
  }, []);

  const value = useMemo(() => ({ unit: unitState, setUnit }), [unitState, setUnit]);

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
}

export function useUnit(): UnitContextValue {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error('useUnit must be used within UnitProvider');
  return ctx;
}
