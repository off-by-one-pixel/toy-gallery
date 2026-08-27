import type { Shape, Toy } from '@/api/types';
import type { Toy as EditorToy } from 'toy-editor';
import { TOY_PROPERTIES } from '@/features/toys/properties';
import { toyShapeToEditor } from '@/features/toys/converters/toyShape';
import type { ToySort, ToySortColumn } from '@/features/toys/toySort';
import { diameterToCircumference, toMm, fromMm, type Unit } from '@/features/preferences/units';
import { displayGirth, type Girth } from '@/features/preferences/girth';

export type GhostToy = Readonly<{
  id: number;
  sourceName: string;
  circumference: number;
  insertableLength: number;
  shape: Shape;
  sourceCircumference: number;
  sourceInsertableLength: number;
}>;

export type GalleryItem = Readonly<{ kind: 'toy'; toy: Toy }> | Readonly<{ kind: 'ghost'; ghost: GhostToy }>;

export type GhostDimensions = Readonly<{ circumference: number; insertableLength: number }>;

const shapeHeight = (shape: Shape): number => shape.sections.reduce((acc, s) => acc + s.height, 0);

const shapeDiameter = (shape: Shape): number => Math.max(0, ...shape.sections.map((s) => s.diameter));

let nextGhostId = 1;

export const createGhost = (source: Toy, dims: GhostDimensions): GhostToy => ({
  id: nextGhostId++,
  sourceName: [source.brand, source.name, source.size].filter(Boolean).join(' '),
  circumference: dims.circumference,
  insertableLength: dims.insertableLength,
  shape: source.shape,
  sourceCircumference:
    source.circumference ?? diameterToCircumference(shapeDiameter(source.shape)) ?? dims.circumference,
  sourceInsertableLength: source.insertableLength ?? shapeHeight(source.shape),
});

const safeRatio = (target: number, reference: number): number => (reference > 0 ? target / reference : 1);

export const ghostScaleFactors = (ghost: GhostToy): Readonly<{ width: number; height: number }> => ({
  width: safeRatio(ghost.circumference, ghost.sourceCircumference),
  height: safeRatio(ghost.insertableLength, ghost.sourceInsertableLength),
});

export const ghostEditorToy = (ghost: GhostToy): EditorToy => {
  const { width, height } = ghostScaleFactors(ghost);
  return toyShapeToEditor({
    ...ghost.shape,
    sections: ghost.shape.sections.map((s) => ({
      ...s,
      diameter: s.diameter * width,
      height: s.height * height,
      circumference: s.circumference == null ? s.circumference : s.circumference * width,
    })),
  });
};

export const ghostSilhouetteHeight = (ghost: GhostToy): number =>
  shapeHeight(ghost.shape) * ghostScaleFactors(ghost).height;

export const ghostSilhouetteDiameter = (ghost: GhostToy): number =>
  shapeDiameter(ghost.shape) * ghostScaleFactors(ghost).width;

const GHOST_SORT_VALUES: Partial<Record<ToySortColumn, (ghost: GhostToy) => number>> = {
  insertable: (ghost) => ghost.insertableLength,
  circumference: (ghost) => ghost.circumference,
};

const itemSortValue = (item: GalleryItem, sort: ToySort): number | string =>
  item.kind === 'toy'
    ? TOY_PROPERTIES[sort.column].sortValue(item.toy)
    : (GHOST_SORT_VALUES[sort.column] as (ghost: GhostToy) => number)(item.ghost);

export const mergeGalleryItems = (
  sortedToys: readonly Toy[],
  ghosts: readonly GhostToy[],
  sort: ToySort | null,
): GalleryItem[] => {
  const items: GalleryItem[] = sortedToys.map((toy) => ({ kind: 'toy', toy }));
  if (!sort || !GHOST_SORT_VALUES[sort.column]) {
    return [...items, ...ghosts.map((ghost): GalleryItem => ({ kind: 'ghost', ghost }))];
  }
  const mul = sort.direction === 'asc' ? 1 : -1;
  for (const ghost of ghosts) {
    const item: GalleryItem = { kind: 'ghost', ghost };
    const value = itemSortValue(item, sort);
    const index = items.findIndex((existing) => mul * Number(itemSortValue(existing, sort)) > mul * Number(value));
    items.splice(index === -1 ? items.length : index, 0, item);
  }
  return items;
};

export type GhostInputs = Readonly<{ girthValue: string; lengthValue: string }>;

export const ghostDimsToInputs = (dims: GhostDimensions, unit: Unit, girth: Girth): GhostInputs => ({
  girthValue: fromMm(displayGirth(dims.circumference, girth) ?? 0, unit).toFixed(unit.decimals),
  lengthValue: fromMm(dims.insertableLength, unit).toFixed(unit.decimals),
});

const parsePositive = (value: string): number | null => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const parseGhostInputs = (inputs: GhostInputs, unit: Unit, girth: Girth): GhostDimensions | null => {
  const girthValue = parsePositive(inputs.girthValue);
  const lengthValue = parsePositive(inputs.lengthValue);
  if (girthValue == null || lengthValue == null) return null;
  const girthMm = toMm(girthValue, unit);
  return {
    circumference: girth === 'diameter' ? (diameterToCircumference(girthMm) ?? girthMm) : girthMm,
    insertableLength: toMm(lengthValue, unit),
  };
};

export const ghostDelta = (toyValueMm: number | null | undefined, ghostValueMm: number): number | null =>
  toyValueMm == null ? null : toyValueMm - ghostValueMm;

export const formatSignedMm = (mm: number | null, unit: Unit): string => {
  if (mm == null) return '—';
  const value = fromMm(mm, unit).toFixed(unit.decimals);
  return mm >= 0 ? `+${value}` : value;
};

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const isShape = (value: unknown): value is Shape => {
  if (typeof value !== 'object' || value === null) return false;
  const sections = (value as Shape).sections;
  return (
    Array.isArray(sections) &&
    sections.every(
      (s) => typeof s === 'object' && s !== null && isPositiveNumber(s.diameter) && isPositiveNumber(s.height),
    )
  );
};

export const isGhostToy = (value: unknown): value is GhostToy => {
  if (typeof value !== 'object' || value === null) return false;
  const ghost = value as GhostToy;
  return (
    isPositiveNumber(ghost.id) &&
    typeof ghost.sourceName === 'string' &&
    isPositiveNumber(ghost.circumference) &&
    isPositiveNumber(ghost.insertableLength) &&
    isPositiveNumber(ghost.sourceCircumference) &&
    isPositiveNumber(ghost.sourceInsertableLength) &&
    isShape(ghost.shape)
  );
};

export const ensureGhostIdsAbove = (ids: readonly number[]): void => {
  nextGhostId = Math.max(nextGhostId, ...ids.map((id) => id + 1));
};

export const MAX_GHOSTS = 3;

export const GHOST_COLORS = ['#f59e0b', '#d946ef', '#06b6d4', '#84cc16', '#f43f5e'] as const;

export const ghostColor = (ghost: GhostToy): string => GHOST_COLORS[(ghost.id - 1) % GHOST_COLORS.length];
