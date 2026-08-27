'use client';

import type { Dispatch, SetStateAction } from 'react';

import { ensureGhostIdsAbove, isGhostToy, MAX_GHOSTS, type GhostToy } from '@/features/toys/gallery/ghosts';
import { usePersistedState } from '@/hooks/usePersistedState';

const isGhostToyList = (value: unknown): value is GhostToy[] =>
  Array.isArray(value) && value.length <= MAX_GHOSTS && value.every(isGhostToy);

const restoreGhostIds = (ghosts: GhostToy[] | undefined): void =>
  ensureGhostIdsAbove((ghosts ?? []).map((ghost) => ghost.id));

export function useGhosts(): [GhostToy[], Dispatch<SetStateAction<GhostToy[]>>] {
  return usePersistedState<GhostToy[]>('gallery.ghosts', [], isGhostToyList, restoreGhostIds);
}
