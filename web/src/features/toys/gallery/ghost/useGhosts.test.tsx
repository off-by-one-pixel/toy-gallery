import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { type GhostToy } from '@/features/toys/gallery/ghost/ghosts';
import { useGhosts } from '@/features/toys/gallery/ghost/useGhosts';
import type { Toy } from '@/api/types';
import { makeGhost, makeToy } from '@/test/fixtures';

const shape = { sections: [{ order: 0, diameter: 45, height: 150 }] };

const seed = (...ghosts: GhostToy[]) => localStorage.setItem('gallery.ghosts', JSON.stringify(ghosts));

const source = makeToy({
  brand: 'Acme',
  name: 'Slim',
  size: 'M',
  circumference: 130,
  insertableLength: 150,
  shape,
} as unknown as Partial<Toy>);

describe('useGhosts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds a ghost created from the source toy', () => {
    const { result } = renderHook(() => useGhosts());
    act(() => result.current.saveGhost({ kind: 'new', source }, { circumference: 140, insertableLength: 165 }));
    expect(result.current.ghosts).toHaveLength(1);
    expect(result.current.ghosts[0].sourceName).toBe('Acme Slim M');
  });

  it('round-trips ghosts through its storage key', () => {
    seed(makeGhost({ id: 3 }));
    const { result } = renderHook(() => useGhosts());
    expect(result.current.ghosts).toEqual([makeGhost({ id: 3 })]);
    act(() => result.current.saveGhost({ kind: 'new', source }, { circumference: 140, insertableLength: 165 }));
    expect(JSON.parse(localStorage.getItem('gallery.ghosts') ?? '[]')).toEqual(result.current.ghosts);
  });

  it('rejects a stored list longer than the ghost cap', () => {
    seed(makeGhost(), makeGhost({ id: 2 }), makeGhost({ id: 3 }), makeGhost({ id: 4 }));
    const { result } = renderHook(() => useGhosts());
    expect(result.current.ghosts).toEqual([]);
  });

  it('rejects a stored list containing malformed entries', () => {
    localStorage.setItem(
      'gallery.ghosts',
      JSON.stringify([makeGhost({ id: 2 }), { id: 'x' }, makeGhost({ id: 4, circumference: -1 }), 'junk']),
    );
    const { result } = renderHook(() => useGhosts());
    expect(result.current.ghosts).toEqual([]);
  });

  it('stops adding at the ghost cap', () => {
    seed(makeGhost(), makeGhost({ id: 2 }), makeGhost({ id: 3 }));
    const { result } = renderHook(() => useGhosts());
    expect(result.current.canAddGhost).toBe(false);
    act(() => result.current.saveGhost({ kind: 'new', source }, { circumference: 140, insertableLength: 165 }));
    expect(result.current.ghosts).toHaveLength(3);
  });

  it('updates only the matching ghost', () => {
    seed(makeGhost(), makeGhost({ id: 2 }));
    const { result } = renderHook(() => useGhosts());
    act(() =>
      result.current.saveGhost({ kind: 'edit', ghost: makeGhost() }, { circumference: 140, insertableLength: 330 }),
    );
    expect(result.current.ghosts[0].insertableLength).toBe(330);
    expect(result.current.ghosts[1].insertableLength).toBe(165);
  });

  it('removes a single ghost and clears them all', () => {
    seed(makeGhost(), makeGhost({ id: 2 }));
    const { result } = renderHook(() => useGhosts());
    act(() => result.current.removeGhost(1));
    expect(result.current.ghosts.map((g) => g.id)).toEqual([2]);
    act(() => result.current.clearGhosts());
    expect(result.current.ghosts).toEqual([]);
  });

  it('allocates new ghost ids above the restored ones', () => {
    seed(makeGhost({ id: 41 }));
    const { result } = renderHook(() => useGhosts());
    act(() => result.current.saveGhost({ kind: 'new', source }, { circumference: 150, insertableLength: 170 }));
    expect(result.current.ghosts.at(-1)!.id).toBeGreaterThan(41);
  });
});
