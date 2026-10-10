import type { Toy as EditorToy } from 'toy-editor';
import { SectionShape, type Toy } from '@/api/types';
import { circumferenceToDiameter } from '@/features/preferences/units';

export function toyToEditor(toy: Toy): EditorToy {
  return {
    sections: toy.shape.sections.map((s) => ({ ...s })),
    topShape: toy.shape.topSectionShape ?? SectionShape.FLAT,
    bottomShape: toy.shape.bottomSectionShape ?? SectionShape.FLAT,
    insertableLengthMm: toy.insertableLength ?? null,
    knownTotalMm: toy.totalLength ?? null,
    knownSizeMm: circumferenceToDiameter(toy.circumference),
  };
}
