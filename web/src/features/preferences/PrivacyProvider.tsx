'use client';

import { useMemo } from 'react';

import { createPersistedProvider } from '@/providers/createPersistedProvider';

interface PrivacyContextValue {
  hideSensitive: boolean;
  toggleHideSensitive: () => void;
}

const { Provider, useValue } = createPersistedProvider<boolean>({
  storageKey: 'hideSensitive',
  defaultValue: false,
  isValid: (value): value is boolean => typeof value === 'boolean',
  errorMessage: 'usePrivacy must be used within PrivacyProvider',
});

export const PrivacyProvider = Provider;

export function usePrivacy(): PrivacyContextValue {
  const { value, setValue } = useValue();
  return useMemo(() => ({ hideSensitive: value, toggleHideSensitive: () => setValue(!value) }), [value, setValue]);
}
