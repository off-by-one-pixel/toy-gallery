'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export const oneOf =
  <T>(values: readonly T[]) =>
  (value: unknown): value is T =>
    values.includes(value as T);

const readStored = (key: string): unknown => {
  const raw = localStorage.getItem(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  isValid: (value: unknown) => value is T,
  onRestore?: (restored: T | undefined) => void,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(defaultValue);
  const stateRef = useRef(state);

  useEffect(() => {
    const stored = readStored(key);
    const restored = isValid(stored) ? stored : undefined;
    if (restored !== undefined) {
      stateRef.current = restored;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(restored);
    }
    onRestore?.(restored);
  }, [key, isValid, onRestore]);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (action) => {
      const next = typeof action === 'function' ? (action as (prev: T) => T)(stateRef.current) : action;
      stateRef.current = next;
      localStorage.setItem(key, JSON.stringify(next));
      setState(next);
    },
    [key],
  );

  return [state, setValue];
}
