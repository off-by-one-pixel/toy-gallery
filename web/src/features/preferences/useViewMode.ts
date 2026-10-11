'use client';

import { oneOf, usePersistedState } from '@/hooks/usePersistedState';

export const ViewMode = {
  cards: 'cards',
  list: 'list',
} as const;
export type ViewMode = (typeof ViewMode)[keyof typeof ViewMode];

const isViewMode = oneOf(Object.values(ViewMode));

export function useViewMode() {
  const [view, setView] = usePersistedState<ViewMode>('gallery.view', ViewMode.cards, isViewMode);
  return { view, setView };
}
