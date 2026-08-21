import { describe, expect, it } from 'vitest';

import type { ToySection } from 'toy-editor';

import { SectionShape } from '@/services/types';
import { editorToPayload, editorToTemplateJson, type EditorState } from './editor';

const sections: ToySection[] = [
  { id: 10, diameter: 40, height: 50, topCurveAngle: 90 },
  { id: 11, diameter: 30, height: 70 },
];

const baseState: EditorState = {
  sections,
  topShape: SectionShape.EGG,
  bottomShape: SectionShape.FLAT,
  insertableLengthMm: 120,
  knownTotalMm: 130,
  knownSizeMm: 40,
};

const identity = { brand: 'Brand', name: 'Model', size: 'M', color: '#c4b5fd' };

describe('editorToPayload', () => {
  it('passes identity fields verbatim', () => {
    const out = editorToPayload({ state: baseState, identity });
    expect(out.brand).toBe('Brand');
    expect(out.name).toBe('Model');
    expect(out.size).toBe('M');
    expect(out.color).toBe('#c4b5fd');
  });

  it('translates editor mm fields to API field names', () => {
    const out = editorToPayload({ state: baseState, identity });
    expect(out.insertableLength).toBe(120);
    expect(out.totalLength).toBe(130);
    expect(out.circumference).toBeCloseTo(40 * Math.PI);
  });

  it('maps shape envelope (topShape → topSectionShape)', () => {
    const out = editorToPayload({ state: baseState, identity });
    expect(out.shape.topSectionShape).toBe(SectionShape.EGG);
    expect(out.shape.bottomSectionShape).toBe(SectionShape.FLAT);
  });

  it('rewrites section order from the array index', () => {
    const reordered: EditorState = { ...baseState, sections: [...sections].reverse() };
    const out = editorToPayload({ state: reordered, identity });
    expect(out.shape.sections.map((s) => s.order)).toEqual([0, 1]);
  });

  it('defaults missing per-section circumference to null', () => {
    const out = editorToPayload({ state: baseState, identity });
    expect(out.shape.sections[0].circumference).toBeNull();
  });

  it('drops the editor-only touched flag from sections', () => {
    const withTouched: EditorState = {
      ...baseState,
      sections: [{ ...sections[0], touched: { diameter: true, height: false } }],
    };
    const out = editorToPayload({ state: withTouched, identity });
    expect(out.shape.sections[0]).not.toHaveProperty('touched');
  });

  it('merges extras when provided', () => {
    const out = editorToPayload({
      state: baseState,
      identity,
      extras: { retired: true, datePurchased: '2025-01-01' },
    });
    expect(out.retired).toBe(true);
    expect(out.datePurchased).toBe('2025-01-01');
  });

  it('omits extras keys when extras is undefined', () => {
    const out = editorToPayload({ state: baseState, identity });
    expect(out.retired).toBeUndefined();
    expect(out.datePurchased).toBeUndefined();
  });

  it('passes null knownSizeMm through as null circumference', () => {
    const out = editorToPayload({ state: { ...baseState, knownSizeMm: null }, identity });
    expect(out.circumference).toBeNull();
  });
});

describe('editorToTemplateJson', () => {
  it('returns a parseable JSON string', () => {
    expect(() => JSON.parse(editorToTemplateJson(baseState))).not.toThrow();
  });

  it('leaves id/name/description blank for the author to fill in', () => {
    const parsed = JSON.parse(editorToTemplateJson(baseState));
    expect(parsed.id).toBe('');
    expect(parsed.name).toBe('');
    expect(parsed.description).toBe('');
  });

  it('serializes reference dimensions in the template field names', () => {
    const parsed = JSON.parse(editorToTemplateJson(baseState));
    expect(parsed.totalLength).toBe(130);
    expect(parsed.insertableLength).toBe(120);
    expect(parsed.circumference).toBeCloseTo(40 * Math.PI);
  });

  it('emits section order from the array index', () => {
    const parsed = JSON.parse(editorToTemplateJson({ ...baseState, sections: [...sections].reverse() }));
    expect(parsed.shape.sections.map((s: { order: number }) => s.order)).toEqual([0, 1]);
  });

  it('preserves per-section curve angles', () => {
    const parsed = JSON.parse(editorToTemplateJson(baseState));
    expect(parsed.shape.sections[0].topCurveAngle).toBe(90);
  });
});
