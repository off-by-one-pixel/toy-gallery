// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Toy } from '@/api/types';
import { createGhost, type GhostToy } from '@/features/toys/gallery/ghost/ghosts';
import { useGhosts } from '@/features/toys/gallery/ghost/useGhosts';

const shape = { sections: [{ order: 0, diameter: 45, height: 150 }] };

const storedGhost = (id: number): GhostToy =>
  ({
    id,
    sourceName: 'Acme Slim M',
    circumference: 140,
    insertableLength: 165,
    shape,
    sourceCircumference: 130,
    sourceInsertableLength: 150,
  }) as GhostToy;

const source = {
  id: 1,
  brand: 'Acme',
  name: 'Slim',
  size: 'M',
  circumference: 130,
  insertableLength: 150,
  shape,
} as unknown as Toy;

describe('useGhosts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists ghosts to localStorage', () => {
    const { result } = renderHook(() => useGhosts());
    act(() => result.current[1]([storedGhost(1)]));
    expect(JSON.parse(localStorage.getItem('gallery.ghosts') ?? '[]')).toEqual([storedGhost(1)]);
  });

  it('hydrates from localStorage on mount', () => {
    localStorage.setItem('gallery.ghosts', JSON.stringify([storedGhost(3)]));
    const { result } = renderHook(() => useGhosts());
    expect(result.current[0]).toEqual([storedGhost(3)]);
  });

  it('rejects a stored list longer than the ghost cap', () => {
    localStorage.setItem(
      'gallery.ghosts',
      JSON.stringify([storedGhost(1), storedGhost(2), storedGhost(3), storedGhost(4)]),
    );
    const { result } = renderHook(() => useGhosts());
    expect(result.current[0]).toEqual([]);
  });

  it('rejects a stored list containing malformed entries', () => {
    localStorage.setItem(
      'gallery.ghosts',
      JSON.stringify([storedGhost(2), { id: 'x' }, { ...storedGhost(4), circumference: -1 }, 'junk']),
    );
    const { result } = renderHook(() => useGhosts());
    expect(result.current[0]).toEqual([]);
  });

  it('recovers from unparsable storage', () => {
    localStorage.setItem('gallery.ghosts', '{not json');
    const { result } = renderHook(() => useGhosts());
    expect(result.current[0]).toEqual([]);
  });

  it('allocates new ghost ids above the restored ones', () => {
    localStorage.setItem('gallery.ghosts', JSON.stringify([storedGhost(41)]));
    renderHook(() => useGhosts());
    const fresh = createGhost(source, { circumference: 150, insertableLength: 170 });
    expect(fresh.id).toBeGreaterThan(41);
  });
});
