import type { Shape, Toy } from '@/api/types';
import { TOY_PROPERTIES } from '@/features/toys/properties';
import type { ToySort, ToySortColumn } from '@/features/toys/toySort';
import { diameterToCircumference, formatForInput, parseToMm, toMm, Unit } from '@/features/preferences/units';
import { displayGirth, storedGirth, type Girth } from '@/features/preferences/girth';

export type GhostToy = Readonly<{
  id: number;
  sourceName: string;
  circumference: number;
  insertableLength: number;
  shape: Shape;
}>;

export type GalleryItem = Readonly<{ kind: 'toy'; toy: Toy }> | Readonly<{ kind: 'ghost'; ghost: GhostToy }>;

export type GhostDimensions = Readonly<{ circumference: number; insertableLength: number }>;

export type GhostTarget = Readonly<{ kind: 'new'; source: Toy }> | Readonly<{ kind: 'edit'; ghost: GhostToy }>;

export const ghostSourceName = (source: Toy): string =>
  [source.brand, source.name, source.size].filter(Boolean).join(' ');

const shapeHeight = (shape: Shape): number => shape.sections.reduce((acc, s) => acc + s.height, 0);

const shapeDiameter = (shape: Shape): number => Math.max(0, ...shape.sections.map((s) => s.diameter));

let nextGhostId = 1;

const safeRatio = (target: number, reference: number): number => (reference > 0 ? target / reference : 1);

const scaleShape = (shape: Shape, width: number, height: number): Shape => ({
  ...shape,
  sections: shape.sections.map((s) => ({
    ...s,
    diameter: s.diameter * width,
    height: s.height * height,
    circumference: s.circumference == null ? s.circumference : s.circumference * width,
  })),
});

export const createGhost = (source: Toy, dims: GhostDimensions): GhostToy => {
  const sourceCircumference =
    source.circumference ?? diameterToCircumference(shapeDiameter(source.shape)) ?? dims.circumference;
  const sourceInsertableLength = source.insertableLength ?? shapeHeight(source.shape);
  return {
    id: nextGhostId++,
    sourceName: ghostSourceName(source),
    circumference: dims.circumference,
    insertableLength: dims.insertableLength,
    shape: scaleShape(
      source.shape,
      safeRatio(dims.circumference, sourceCircumference),
      safeRatio(dims.insertableLength, sourceInsertableLength),
    ),
  };
};

export const updateGhostDimensions = (ghost: GhostToy, dims: GhostDimensions): GhostToy => ({
  ...ghost,
  ...dims,
  shape: scaleShape(
    ghost.shape,
    safeRatio(dims.circumference, ghost.circumference),
    safeRatio(dims.insertableLength, ghost.insertableLength),
  ),
});

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
  girthValue: formatForInput(displayGirth(dims.circumference, girth) ?? 0, unit),
  lengthValue: formatForInput(dims.insertableLength, unit),
});

export const parseGhostInputs = (inputs: GhostInputs, unit: Unit, girth: Girth): GhostDimensions | null => {
  const girthMm = parseToMm(inputs.girthValue, unit);
  const lengthMm = parseToMm(inputs.lengthValue, unit);
  if (girthMm == null || lengthMm == null) return null;
  return {
    circumference: storedGirth(girthMm, girth),
    insertableLength: lengthMm,
  };
};

export const ghostDelta = (toyValueMm: number | null | undefined, ghostValueMm: number): number | null =>
  toyValueMm == null ? null : ghostValueMm - toyValueMm;

const DANGEROUS_GIRTH_DELTA_MM = toMm(0.5, Unit.in);

export const isDangerousGirthDelta = (deltaMm: number | null): boolean =>
  deltaMm != null && deltaMm > DANGEROUS_GIRTH_DELTA_MM;

export const formatSignedMm = (mm: number | null, unit: Unit): string => {
  if (mm == null) return '—';
  const value = formatForInput(mm, unit);
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
    isShape(ghost.shape)
  );
};

export const ensureGhostIdsAbove = (ids: readonly number[]): void => {
  nextGhostId = Math.max(nextGhostId, ...ids.map((id) => id + 1));
};

export const MAX_GHOSTS = 3;

export const GHOST_COLORS = ['#f59e0b', '#d946ef', '#06b6d4', '#84cc16', '#f43f5e'] as const;

export const ghostColor = (ghost: GhostToy): string => GHOST_COLORS[(ghost.id - 1) % GHOST_COLORS.length];
