'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { Unit } from '../services/units';

const STORAGE_KEY = 'units';

interface UnitContextValue {
  unit: Unit;
  setUnit: (unit: Unit) => void;
}

const UnitContext = createContext<UnitContextValue | null>(null);

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<Unit>('mm');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === 'mm' || stored === 'in') setUnitState(stored);
  }, []);

  const setUnit = useCallback((next: Unit) => {
    setUnitState(next);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return <UnitContext.Provider value={{ unit, setUnit }}>{children}</UnitContext.Provider>;
}

export function useUnit(): UnitContextValue {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error('useUnit must be used within UnitProvider');
  return ctx;
}
