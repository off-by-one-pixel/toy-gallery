import { describe, expect, it } from 'vitest';

import { SectionShape, type Toy } from '@/api/types';
import { toyToEditor } from '@/features/toys/converters/toy';

const baseToy: Toy = {
  id: 1,
  brand: 'Brand',
  name: 'Model',
  size: 'M',
  color: '#c4b5fd',
  insertableLength: 120,
  totalLength: 130,
  circumference: 40 * Math.PI,
  usageCount: 0,
  totalDurationMinutes: 0,
  maxDurationMinutes: 0,
  records: [],
  shape: {
    topSectionShape: SectionShape.EGG,
    bottomSectionShape: SectionShape.FLAT,
    sections: [
      { id: 10, order: 0, diameter: 40, height: 50 },
      { id: 11, order: 1, diameter: 30, height: 70 },
    ],
  },
};

describe('toyToEditor', () => {
  it('translates the section shape envelope', () => {
    const out = toyToEditor(baseToy);
    expect(out.topShape).toBe(SectionShape.EGG);
    expect(out.bottomShape).toBe(SectionShape.FLAT);
  });

  it('defaults missing top/bottom section shapes to FLAT', () => {
    const out = toyToEditor({
      ...baseToy,
      shape: { ...baseToy.shape, topSectionShape: undefined, bottomSectionShape: undefined },
    });
    expect(out.topShape).toBe(SectionShape.FLAT);
    expect(out.bottomShape).toBe(SectionShape.FLAT);
  });

  it('shallow-copies each section so editor mutation does not leak back', () => {
    const out = toyToEditor(baseToy);
    expect(out.sections[0]).not.toBe(baseToy.shape.sections[0]);
    expect(out.sections[0]).toEqual(baseToy.shape.sections[0]);
  });

  it('maps insertable/total length through with null fallback', () => {
    expect(toyToEditor(baseToy).insertableLengthMm).toBe(120);
    expect(toyToEditor(baseToy).knownTotalMm).toBe(130);
    const out = toyToEditor({ ...baseToy, insertableLength: null, totalLength: null });
    expect(out.insertableLengthMm).toBeNull();
    expect(out.knownTotalMm).toBeNull();
  });

  it('converts circumference to diameter via π for knownSizeMm', () => {
    expect(toyToEditor(baseToy).knownSizeMm).toBeCloseTo(40);
  });

  it('passes null circumference through as null knownSizeMm', () => {
    expect(toyToEditor({ ...baseToy, circumference: null }).knownSizeMm).toBeNull();
  });
});
