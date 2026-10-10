// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QueryWrapper } from '@/test/QueryWrapper';
import { useToyEditorLabels } from '@/features/toys/editor/useToyEditorLabels';

describe('useToyEditorLabels', () => {
  it('fills every toy editor label from the catalog', () => {
    const { result } = renderHook(() => useToyEditorLabels(), { wrapper: QueryWrapper });
    const labels = result.current;

    expect(labels).toMatchObject({
      knownMeasurements: 'Known measurements',
      insertable: 'Insertable',
      total: 'Total',
      circumference: 'Circumference',
      snap: 'Snap',
      sectionCircumferences: 'Section circumferences',
      topShape: 'Top shape',
      bottomShape: 'Bottom shape',
      shapes: { FLAT: 'Flat', EGG: 'Egg', CONE: 'Cone', SPIKE: 'Spike' },
      addSection: '+ Add section',
      addReferenceImage: 'Add reference image',
      removeReferenceImage: 'Remove reference image',
      referenceImageFile: 'Reference image file',
      resizeReferenceImage: 'Resize reference image',
      heightPrefix: 'H',
      circumferencePrefix: 'C',
      sectionTooWide: 'Section is wider than the known size guide',
      sectionColorPalette: 'Section color',
      toyColor: 'Toy color',
      customColor: 'Custom color',
    });
    expect(labels.insertableGuide('120 mm')).toBe('insertable 120 mm');
    expect(labels.totalGuide('150 mm')).toBe('total 150 mm');
    expect(labels.totalReadout('140 mm')).toBe('total 140 mm');
    expect(labels.sectionHeight(2)).toBe('Height of section 2');
    expect(labels.sectionDiameter(2)).toBe('Diameter of section 2');
    expect(labels.sectionCircumference(2)).toBe('Circumference of section 2');
    expect(labels.sectionTopAngle(2, 30)).toBe('Section 2 top angle (30°)');
    expect(labels.sectionBottomAngle(3, 45)).toBe('Section 3 bottom angle (45°)');
    expect(labels.removeSection(2)).toBe('Remove section 2');
    expect(labels.sectionColor(2)).toBe('Color of section 2');
  });
});
