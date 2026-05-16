import type { Toy as EditorToy } from 'cone-editor';
import { SectionShape, type Shape } from '../types';

/** Map a domain Shape to the read-only triple the thumbnail renderer
 *  needs. Used by card / list / chip thumbnails that don't care about
 *  the manufacturer reference dimensions (insertable / total / size).
 *  The optional EditorToy reference fields stay `undefined`. */
export function toyShapeToEditor(shape: Shape): EditorToy {
  return {
    sections: shape.sections,
    topShape: shape.topSectionShape ?? SectionShape.FLAT,
    bottomShape: shape.bottomSectionShape ?? SectionShape.FLAT,
  };
}
