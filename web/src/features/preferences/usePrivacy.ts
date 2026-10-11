'use client';

import { usePersistedState } from '@/hooks/usePersistedState';

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

export function usePrivacy() {
  const [hideSensitive, setHideSensitive] = usePersistedState('hideSensitive', false, isBoolean);
  return { hideSensitive, toggleHideSensitive: () => setHideSensitive((hidden) => !hidden) };
}
