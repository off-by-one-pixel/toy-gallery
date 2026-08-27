'use client';

import { createContext, ReactNode, useContext, useMemo } from 'react';

import { usePersistedState } from '@/hooks/usePersistedState';

export interface PersistedValue<T> {
  value: T;
  setValue: (next: T) => void;
}

interface PersistedProviderOptions<T> {
  readonly storageKey: string;
  readonly defaultValue: T;
  readonly isValid: (value: unknown) => value is T;
  readonly errorMessage: string;
}

export function createPersistedProvider<T>(options: PersistedProviderOptions<T>) {
  const { storageKey, defaultValue, isValid, errorMessage } = options;
  const Context = createContext<PersistedValue<T> | null>(null);

  function Provider({ children }: Readonly<{ children: ReactNode }>) {
    const [value, setValue] = usePersistedState(storageKey, defaultValue, isValid);
    const ctx = useMemo(() => ({ value, setValue }), [value, setValue]);
    return <Context.Provider value={ctx}>{children}</Context.Provider>;
  }

  function useValue(): PersistedValue<T> {
    const ctx = useContext(Context);
    if (!ctx) throw new Error(errorMessage);
    return ctx;
  }

  return { Provider, useValue };
}
