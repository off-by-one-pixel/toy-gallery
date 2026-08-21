import { describe, expect, it } from 'vitest';

import { SectionShape, type Shape } from '@/api/types';
import { toyShapeToEditor } from './toyShape';

const sections: Shape['sections'] = [
  { id: 0, order: 0, diameter: 40, height: 30 },
  { id: 1, order: 1, diameter: 32, height: 50 },
];

describe('toyShapeToEditor', () => {
  it('passes sections through by reference', () => {
    const shape: Shape = { topSectionShape: SectionShape.CONE, bottomSectionShape: SectionShape.FLAT, sections };
    expect(toyShapeToEditor(shape).sections).toBe(sections);
  });

  it('translates explicit top/bottom section shapes', () => {
    const result = toyShapeToEditor({
      topSectionShape: SectionShape.EGG,
      bottomSectionShape: SectionShape.SPIKE,
      sections,
    });
    expect(result.topShape).toBe(SectionShape.EGG);
    expect(result.bottomShape).toBe(SectionShape.SPIKE);
  });

  it('defaults missing topSectionShape to FLAT', () => {
    expect(toyShapeToEditor({ sections }).topShape).toBe(SectionShape.FLAT);
  });

  it('defaults missing bottomSectionShape to FLAT', () => {
    expect(toyShapeToEditor({ sections }).bottomShape).toBe(SectionShape.FLAT);
  });
});
