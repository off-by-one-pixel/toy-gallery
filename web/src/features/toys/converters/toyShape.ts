import type { Toy as EditorToy } from 'toy-editor';
import { SectionShape, type Shape } from '@/api/types';

export function toyShapeToEditor(shape: Shape): EditorToy {
  return {
    sections: shape.sections,
    topShape: shape.topSectionShape ?? SectionShape.FLAT,
    bottomShape: shape.bottomSectionShape ?? SectionShape.FLAT,
  };
}
