'use client';

import { useMemo } from 'react';

import { createPersistedProvider } from '@/providers/createPersistedProvider';

interface PrivacyContextValue {
  hideSensitive: boolean;
  toggleHideSensitive: () => void;
}

const decodeFlag = (stored: string): boolean | undefined => {
  if (stored === '1') return true;
  if (stored === '0') return false;
  return undefined;
};

const { Provider, useValue } = createPersistedProvider<boolean>({
  storageKey: 'hideSensitive',
  defaultValue: false,
  decode: decodeFlag,
  encode: (hide) => (hide ? '1' : '0'),
  errorMessage: 'usePrivacy must be used within PrivacyProvider',
});

export const PrivacyProvider = Provider;

export function usePrivacy(): PrivacyContextValue {
  const { value, setValue } = useValue();
  return useMemo(() => ({ hideSensitive: value, toggleHideSensitive: () => setValue(!value) }), [value, setValue]);
}
