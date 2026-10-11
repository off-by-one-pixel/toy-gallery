'use client';

import { useEffect } from 'react';

import {
  createGhost,
  ensureGhostIdsAbove,
  isGhostToy,
  MAX_GHOSTS,
  updateGhostDimensions,
  type GhostDimensions,
  type GhostTarget,
  type GhostToy,
} from '@/features/toys/gallery/ghost/ghosts';
import { usePersistedState } from '@/hooks/usePersistedState';

const isGhostToyList = (value: unknown): value is GhostToy[] =>
  Array.isArray(value) && value.length <= MAX_GHOSTS && value.every(isGhostToy);

const NO_GHOSTS: GhostToy[] = [];

export interface Ghosts {
  ghosts: GhostToy[];
  canAddGhost: boolean;
  saveGhost: (target: GhostTarget, dims: GhostDimensions) => void;
  removeGhost: (id: number) => void;
  clearGhosts: () => void;
}

export function useGhosts(): Ghosts {
  const [ghosts, setGhosts] = usePersistedState('gallery.ghosts', NO_GHOSTS, isGhostToyList);
  useEffect(() => ensureGhostIdsAbove(ghosts.map((ghost) => ghost.id)), [ghosts]);
  return {
    ghosts,
    canAddGhost: ghosts.length < MAX_GHOSTS,
    saveGhost: (target, dims) =>
      setGhosts((current) => {
        if (target.kind === 'edit') {
          return current.map((g) => (g.id === target.ghost.id ? updateGhostDimensions(g, dims) : g));
        }
        return current.length < MAX_GHOSTS ? [...current, createGhost(target.source, dims)] : current;
      }),
    removeGhost: (id) => setGhosts((current) => current.filter((g) => g.id !== id)),
    clearGhosts: () => setGhosts([]),
  };
}
