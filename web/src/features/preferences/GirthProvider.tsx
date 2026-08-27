'use client';

import { useMemo } from 'react';

import { DEFAULT_GIRTH, type Girth, GIRTHS } from '@/features/preferences/girth';
import { oneOf } from '@/hooks/usePersistedState';
import { createPersistedProvider } from '@/providers/createPersistedProvider';

interface GirthContextValue {
  girth: Girth;
  setGirth: (girth: Girth) => void;
}

const { Provider, useValue } = createPersistedProvider<Girth>({
  storageKey: 'girth',
  defaultValue: DEFAULT_GIRTH,
  isValid: oneOf(GIRTHS),
  errorMessage: 'useGirth must be used within GirthProvider',
});

export const GirthProvider = Provider;

export function useGirth(): GirthContextValue {
  const { value, setValue } = useValue();
  return useMemo(() => ({ girth: value, setGirth: setValue }), [value, setValue]);
}
