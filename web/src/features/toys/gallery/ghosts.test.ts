import { describe, expect, it } from 'vitest';

import type { Toy } from '@/api/types';
import { Unit } from '@/features/preferences/units';
import {
  createGhost,
  ghostDelta,
  formatSignedMm,
  ghostColor,
  GHOST_COLORS,
  ghostDimsToInputs,
  ghostEditorToy,
  ghostScaleFactors,
  ghostSilhouetteDiameter,
  ghostSilhouetteHeight,
  mergeGalleryItems,
  parseGhostInputs,
  type GhostToy,
} from '@/features/toys/gallery/ghosts';

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
  sourceCircumference: 100,
  sourceInsertableLength: 150,
});

const itemLabel = (item: ReturnType<typeof mergeGalleryItems>[number]) =>
  item.kind === 'toy' ? item.toy.name : `ghost-${item.ghost.id}`;

describe('createGhost', () => {
  it('captures the source display name, shape, reference dims and unique ids', () => {
    const source = toy(7, 'Slim', 120, 150);
    const first = createGhost(source, { circumference: 140, insertableLength: 165 });
    const second = createGhost(source, { circumference: 140, insertableLength: 165 });
    expect(first.sourceName).toBe('Acme Slim M');
    expect(first.circumference).toBe(140);
    expect(first.insertableLength).toBe(165);
    expect(first.shape).toBe(source.shape);
    expect(first.sourceCircumference).toBe(120);
    expect(first.sourceInsertableLength).toBe(150);
    expect(first.id).not.toBe(second.id);
  });

  it('falls back to the shape dimensions when the source has no reference dims', () => {
    const source = toy(8, 'Bare', null, null);
    const created = createGhost(source, { circumference: 140, insertableLength: 165 });
    expect(created.sourceCircumference).toBeCloseTo(45 * Math.PI, 6);
    expect(created.sourceInsertableLength).toBe(150);
  });
});

describe('ghost silhouette scaling', () => {
  it('derives width and height factors from the reference dims', () => {
    expect(ghostScaleFactors(ghost(1, 140, 165))).toEqual({ width: 1.4, height: 1.1 });
  });

  it('scales the cloned shape proportionally to the entered dims', () => {
    const editorToy = ghostEditorToy(ghost(1, 140, 165));
    expect(editorToy.sections).toEqual([{ order: 0, diameter: 45 * 1.4, height: 150 * 1.1, circumference: 130 * 1.4 }]);
    expect(ghostSilhouetteHeight(ghost(1, 140, 165))).toBeCloseTo(165, 6);
    expect(ghostSilhouetteDiameter(ghost(1, 140, 165))).toBeCloseTo(63, 6);
  });

  it('keeps the shape unscaled when a reference dimension is missing', () => {
    const broken: GhostToy = { ...ghost(1, 140, 165), sourceCircumference: 0, sourceInsertableLength: 0 };
    expect(ghostScaleFactors(broken)).toEqual({ width: 1, height: 1 });
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
  it('parses circumference inputs in the active unit', () => {
    expect(parseGhostInputs({ girthValue: '140', lengthValue: '165' }, Unit.mm, 'circumference')).toEqual({
      circumference: 140,
      insertableLength: 165,
    });
    expect(parseGhostInputs({ girthValue: '14', lengthValue: '16.5' }, Unit.cm, 'circumference')).toEqual({
      circumference: 140,
      insertableLength: 165,
    });
  });

  it('converts a diameter input to the stored circumference', () => {
    const dims = parseGhostInputs({ girthValue: '45', lengthValue: '165' }, Unit.mm, 'diameter');
    expect(dims?.circumference).toBeCloseTo(45 * Math.PI, 6);
    expect(dims?.insertableLength).toBe(165);
  });

  it('accepts a decimal comma and rejects junk and non-positive values', () => {
    expect(parseGhostInputs({ girthValue: '14,5', lengthValue: '16' }, Unit.cm, 'circumference')).toEqual({
      circumference: 145,
      insertableLength: 160,
    });
    expect(parseGhostInputs({ girthValue: 'abc', lengthValue: '165' }, Unit.mm, 'circumference')).toBeNull();
    expect(parseGhostInputs({ girthValue: '0', lengthValue: '165' }, Unit.mm, 'circumference')).toBeNull();
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
