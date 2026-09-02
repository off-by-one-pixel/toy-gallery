import { describe, expect, it } from 'vitest';

import type { ToySection } from 'toy-editor';

import type { EditorState } from '@/features/toys/converters/editor';
import {
  identityReducer,
  initialIdentity,
  type ToyEditMode,
  type ToyIdentity,
  validateAndBuildPayload,
} from '@/features/toys/editor/toyEditForm';
import { SectionShape, type Toy } from '@/api/types';

const SECTIONS: ToySection[] = [
  { id: 0, diameter: 40, height: 50 },
  { id: 1, diameter: 32, height: 70 },
];

const EDITOR: EditorState = {
  sections: SECTIONS,
  topShape: SectionShape.EGG,
  bottomShape: SectionShape.FLAT,
  insertableLengthMm: 120,
  knownTotalMm: 130,
  knownSizeMm: 40,
};

const SOURCE_TOY: Toy = {
  id: 7,
  brand: 'BrandA',
  name: 'ModelA',
  size: 'M',
  color: '#abcdef',
  insertableLength: 120,
  totalLength: 130,
  circumference: null,
  datePurchased: '2025-01-01',
  retired: false,
  usageCount: 0,
  totalDurationMinutes: 0,
  maxDurationMinutes: 0,
  shape: { topSectionShape: SectionShape.EGG, bottomSectionShape: SectionShape.FLAT, sections: [] },
  customAttributes: { season: 'spring' },
};

describe('initialIdentity', () => {
  it('seeds empty fields plus the default color for a new toy', () => {
    expect(initialIdentity(null, '#c4b5fd')).toEqual({ brand: '', name: '', size: '', color: '#c4b5fd' });
  });

  it("seeds from the source's existing fields", () => {
    expect(initialIdentity(SOURCE_TOY, '#c4b5fd')).toEqual({
      brand: 'BrandA',
      name: 'ModelA',
      size: 'M',
      color: '#abcdef',
    });
  });

  it('falls back to the default color when the source has no color', () => {
    const blank: Toy = { ...SOURCE_TOY, color: '' };
    expect(initialIdentity(blank, '#c4b5fd').color).toBe('#c4b5fd');
  });
});

describe('identityReducer', () => {
  const start: ToyIdentity = { brand: '', name: '', size: '', color: '#c4b5fd' };

  it('updates a single field, leaving the rest untouched', () => {
    expect(identityReducer(start, { field: 'brand', value: 'Acme' })).toEqual({ ...start, brand: 'Acme' });
  });

  it('overwrites a previously-set field', () => {
    const after = identityReducer({ ...start, name: 'Old' }, { field: 'name', value: 'New' });
    expect(after.name).toBe('New');
  });

  it('does not mutate the input state', () => {
    const before = { ...start };
    identityReducer(start, { field: 'size', value: 'L' });
    expect(start).toEqual(before);
  });
});

describe('validateAndBuildPayload', () => {
  const valid: ToyIdentity = { brand: 'Acme', name: 'Cone', size: 'M', color: '#c4b5fd' };
  const newMode: ToyEditMode = { kind: 'new' };

  it('returns an error when brand is empty / whitespace-only', () => {
    const result = validateAndBuildPayload({ ...valid, brand: '   ' }, EDITOR, newMode);
    expect(result).toEqual({ ok: false, error: 'Brand and name are required.' });
  });

  it('returns an error when name is empty / whitespace-only', () => {
    const result = validateAndBuildPayload({ ...valid, name: '' }, EDITOR, newMode);
    expect(result).toEqual({ ok: false, error: 'Brand and name are required.' });
  });

  it('returns an error when there are zero sections', () => {
    const result = validateAndBuildPayload(valid, { ...EDITOR, sections: [] }, newMode);
    expect(result).toEqual({ ok: false, error: 'At least one section is required.' });
  });

  it('returns ok with an assembled payload when input is valid', () => {
    const result = validateAndBuildPayload(valid, EDITOR, newMode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.brand).toBe('Acme');
    expect(result.payload.name).toBe('Cone');
    expect(result.payload.shape.sections).toHaveLength(2);
  });

  it('trims surrounding whitespace from brand / name / size', () => {
    const result = validateAndBuildPayload({ ...valid, brand: '  Acme  ', name: ' Cone', size: 'M ' }, EDITOR, newMode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.brand).toBe('Acme');
    expect(result.payload.name).toBe('Cone');
    expect(result.payload.size).toBe('M');
  });

  it('omits copy-mode extras when the mode is `new`', () => {
    const result = validateAndBuildPayload(valid, EDITOR, newMode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.datePurchased).toBeUndefined();
    expect(result.payload.retired).toBeUndefined();
    expect(result.payload.customAttributes).toBeUndefined();
  });

  it('omits copy-mode extras when the mode is `edit`', () => {
    const result = validateAndBuildPayload(valid, EDITOR, { kind: 'edit', toy: SOURCE_TOY });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.datePurchased).toBeUndefined();
    expect(result.payload.retired).toBeUndefined();
    expect(result.payload.customAttributes).toBeUndefined();
  });

  it('carries datePurchased / retired / customAttributes through copy mode', () => {
    const result = validateAndBuildPayload(valid, EDITOR, { kind: 'copy', toy: SOURCE_TOY });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.datePurchased).toBe('2025-01-01');
    expect(result.payload.retired).toBe(false);
    expect(result.payload.customAttributes).toEqual({ season: 'spring' });
  });
});
