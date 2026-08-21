'use client';

import { useMemo } from 'react';

import { createPersistedProvider } from '@/providers/createPersistedProvider';

export const ViewMode = {
  cards: 'cards',
  list: 'list',
} as const;
export type ViewMode = (typeof ViewMode)[keyof typeof ViewMode];

interface ViewModeContextValue {
  view: ViewMode;
  setView: (view: ViewMode) => void;
}

const isViewMode = (value: string): value is ViewMode => value === ViewMode.cards || value === ViewMode.list;

const { Provider, useValue } = createPersistedProvider<ViewMode>({
  storageKey: 'gallery.view',
  defaultValue: ViewMode.cards,
  decode: (stored) => (isViewMode(stored) ? stored : undefined),
  encode: (view) => view,
  errorMessage: 'useViewMode must be used within ViewModeProvider',
});

export const ViewModeProvider = Provider;

export function useViewMode(): ViewModeContextValue {
  const { value, setValue } = useValue();
  return useMemo(() => ({ view: value, setView: setValue }), [value, setValue]);
}
