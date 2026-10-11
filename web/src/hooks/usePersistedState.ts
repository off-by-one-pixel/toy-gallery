'use client';

import { useCallback, useMemo, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';

export const oneOf =
  <T>(values: readonly T[]) =>
  (value: unknown): value is T =>
    values.includes(value as T);

const listeners = new Map<string, Set<() => void>>();

const resolve = <T>(raw: string | null, defaultValue: T, isValid: (value: unknown) => value is T): T => {
  if (raw === null) return defaultValue;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
};

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  isValid: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const subscribe = useCallback(
    (listener: () => void) => {
      const keyListeners = listeners.get(key) ?? new Set();
      listeners.set(key, keyListeners);
      keyListeners.add(listener);
      return () => {
        keyListeners.delete(listener);
      };
    },
    [key],
  );
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key),
    () => null,
  );
  const value = useMemo(() => resolve(raw, defaultValue, isValid), [raw, defaultValue, isValid]);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (action) => {
      const current = resolve(localStorage.getItem(key), defaultValue, isValid);
      const next = typeof action === 'function' ? (action as (prev: T) => T)(current) : action;
      localStorage.setItem(key, JSON.stringify(next));
      listeners.get(key)?.forEach((listener) => listener());
    },
    [key, defaultValue, isValid],
  );

  return [value, setValue];
}
