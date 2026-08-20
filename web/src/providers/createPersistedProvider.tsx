'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface PersistedValue<T> {
  value: T;
  setValue: (next: T) => void;
}

interface PersistedProviderOptions<T> {
  readonly storageKey: string;
  readonly defaultValue: T;
  readonly decode: (stored: string) => T | undefined;
  readonly encode: (value: T) => string;
  readonly errorMessage: string;
}

export function createPersistedProvider<T>(options: PersistedProviderOptions<T>) {
  const { storageKey, defaultValue, decode, encode, errorMessage } = options;
  const Context = createContext<PersistedValue<T> | null>(null);

  function Provider({ children }: Readonly<{ children: ReactNode }>) {
    const [state, setState] = useState<T>(defaultValue);

    useEffect(() => {
      const stored = localStorage.getItem(storageKey);
      const restored = stored === null ? undefined : decode(stored);
      if (restored !== undefined) setState(restored);
    }, []);

    const setValue = useCallback((next: T) => {
      setState(next);
      localStorage.setItem(storageKey, encode(next));
    }, []);

    const value = useMemo(() => ({ value: state, setValue }), [state, setValue]);

    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useValue(): PersistedValue<T> {
    const ctx = useContext(Context);
    if (!ctx) throw new Error(errorMessage);
    return ctx;
  }

  return { Provider, useValue };
}
