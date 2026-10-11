'use client';

import { DEFAULT_GIRTH, GIRTHS } from '@/features/preferences/girth';
import { oneOf, usePersistedState } from '@/hooks/usePersistedState';

const isGirth = oneOf(GIRTHS);

export function useGirth() {
  const [girth, setGirth] = usePersistedState('girth', DEFAULT_GIRTH, isGirth);
  return { girth, setGirth };
}
