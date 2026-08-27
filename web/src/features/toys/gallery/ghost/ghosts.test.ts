import { describe, expect, it } from 'vitest';

import type { Toy } from '@/api/types';
import { Unit } from '@/features/preferences/units';
import { silhouetteDiameter, silhouetteHeight } from '@/features/toys/dimensions';
import {
  createGhost,
  ghostDelta,
  formatSignedMm,
  ghostColor,
  GHOST_COLORS,
  ghostDimsToInputs,
  mergeGalleryItems,
  parseGhostInputs,
  updateGhostDimensions,
  type GhostToy,
} from '@/features/toys/gallery/ghost/ghosts';

const shape = { sections: [{ order: 0, diameter: 45, height: 150, circumference: 130 }] } as Toy['shape'];

const toy = (id: number, name: string, circumference: number | null, insertableLength: number | null): Toy =>
  ({
    id,
    brand: 'Acme',
    name,
    size: 'M',
    circumference,
    insertableLength,
    shape,
  }) as unknown as Toy;

const ghost = (id: number, circumference: number, insertableLength: number): GhostToy => ({
  id,
  sourceName: 'Acme Source M',
  circumference,
  insertableLength,
  shape,
});

const itemLabel = (item: ReturnType<typeof mergeGalleryItems>[number]) =>
  item.kind === 'toy' ? item.toy.name : `ghost-${item.ghost.id}`;

describe('createGhost', () => {
  it('captures the source display name, entered dims and unique ids', () => {
    const source = toy(7, 'Slim', 120, 150);
    const first = createGhost(source, { circumference: 140, insertableLength: 165 });
    const second = createGhost(source, { circumference: 140, insertableLength: 165 });
    expect(first.sourceName).toBe('Acme Slim M');
    expect(first.circumference).toBe(140);
    expect(first.insertableLength).toBe(165);
    expect(first.id).not.toBe(second.id);
  });

  it('stores the source shape scaled proportionally to the entered dims', () => {
    const created = createGhost(toy(7, 'Slim', 120, 150), { circumference: 140, insertableLength: 165 });
    expect(created.shape.sections).toEqual([
      { order: 0, diameter: 45 * (140 / 120), height: 165, circumference: 130 * (140 / 120) },
    ]);
    expect(silhouetteHeight(created)).toBeCloseTo(165, 6);
    expect(silhouetteDiameter(created)).toBeCloseTo(52.5, 6);
  });

  it('falls back to the shape dimensions when the source has no reference dims', () => {
    const created = createGhost(toy(8, 'Bare', null, null), { circumference: 140, insertableLength: 165 });
    expect(silhouetteHeight(created)).toBeCloseTo(165, 6);
    expect(silhouetteDiameter(created)).toBeCloseTo(140 / Math.PI, 6);
  });

  it('keeps the shape unscaled when a reference dimension is zero', () => {
    const created = createGhost(toy(9, 'Flat', 0, 0), { circumference: 140, insertableLength: 165 });
    expect(silhouetteDiameter(created)).toBe(45);
  });
});

describe('updateGhostDimensions', () => {
  it('rescales the stored shape to the new dims', () => {
    const created = createGhost(toy(7, 'Slim', 120, 150), { circumference: 140, insertableLength: 165 });
    const updated = updateGhostDimensions(created, { circumference: 120, insertableLength: 180 });
    expect(updated.circumference).toBe(120);
    expect(updated.insertableLength).toBe(180);
    expect(silhouetteHeight(updated)).toBeCloseTo(180, 6);
    expect(silhouetteDiameter(updated)).toBeCloseTo(45, 6);
  });
});

describe('mergeGalleryItems', () => {
  const toys = [toy(1, 'Small', 100, 120), toy(2, 'Mid', 130, 150), toy(3, 'Big', 160, 190)];

  it('inserts ghosts at their sorted position for girth ascending', () => {
    const items = mergeGalleryItems(toys, [ghost(1, 140, 165)], { column: 'circumference', direction: 'asc' });
    expect(items.map(itemLabel)).toEqual(['Small', 'Mid', 'ghost-1', 'Big']);
  });

  it('respects descending direction', () => {
    const sorted = [...toys].reverse();
    const items = mergeGalleryItems(sorted, [ghost(1, 140, 165)], { column: 'circumference', direction: 'desc' });
    expect(items.map(itemLabel)).toEqual(['Big', 'ghost-1', 'Mid', 'Small']);
  });

  it('orders ghosts against each other by insertable length', () => {
    const items = mergeGalleryItems(toys, [ghost(1, 0, 200), ghost(2, 0, 130)], {
      column: 'insertable',
      direction: 'asc',
    });
    expect(items.map(itemLabel)).toEqual(['Small', 'ghost-2', 'Mid', 'Big', 'ghost-1']);
  });

  it('appends ghosts for unmapped sort columns and null sort', () => {
    const byName = mergeGalleryItems(toys, [ghost(1, 140, 165)], { column: 'name', direction: 'asc' });
    expect(itemLabel(byName.at(-1)!)).toBe('ghost-1');
    const unsorted = mergeGalleryItems(toys, [ghost(1, 140, 165)], null);
    expect(itemLabel(unsorted.at(-1)!)).toBe('ghost-1');
  });
});

describe('ghost input parsing', () => {
  it('parses circumference inputs into dimensions', () => {
    expect(parseGhostInputs({ girthValue: '140', lengthValue: '165' }, Unit.mm, 'circumference')).toEqual({
      circumference: 140,
      insertableLength: 165,
    });
  });

  it('converts a diameter input to the stored circumference', () => {
    const dims = parseGhostInputs({ girthValue: '45', lengthValue: '165' }, Unit.mm, 'diameter');
    expect(dims?.circumference).toBeCloseTo(45 * Math.PI, 6);
    expect(dims?.insertableLength).toBe(165);
  });

  it('returns null when either input is invalid', () => {
    expect(parseGhostInputs({ girthValue: 'abc', lengthValue: '165' }, Unit.mm, 'circumference')).toBeNull();
    expect(parseGhostInputs({ girthValue: '140', lengthValue: '-5' }, Unit.mm, 'circumference')).toBeNull();
  });

  it('round-trips dimensions through display inputs', () => {
    const dims = { circumference: 140, insertableLength: 165 };
    const inputs = ghostDimsToInputs(dims, Unit.cm, 'circumference');
    expect(inputs).toEqual({ girthValue: '14.0', lengthValue: '16.5' });
    expect(parseGhostInputs(inputs, Unit.cm, 'circumference')).toEqual(dims);
  });
});

describe('ghost helpers', () => {
  it('computes signed deltas and passes through missing toy values', () => {
    expect(ghostDelta(150, 140)).toBe(10);
    expect(ghostDelta(130, 140)).toBe(-10);
    expect(ghostDelta(null, 140)).toBeNull();
  });
});

describe('formatSignedMm', () => {
  it('formats signed values in the display unit and dashes missing ones', () => {
    expect(formatSignedMm(40, Unit.mm)).toBe('+40');
    expect(formatSignedMm(-35, Unit.cm)).toBe('-3.5');
    expect(formatSignedMm(null, Unit.mm)).toBe('—');
  });
});

describe('ghostColor', () => {
  it('cycles the palette by ghost id', () => {
    expect(ghostColor(ghost(1, 140, 165))).toBe(GHOST_COLORS[0]);
    expect(ghostColor(ghost(2, 140, 165))).toBe(GHOST_COLORS[1]);
    expect(ghostColor(ghost(GHOST_COLORS.length + 1, 140, 165))).toBe(GHOST_COLORS[0]);
  });
});
