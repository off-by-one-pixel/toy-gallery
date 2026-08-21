import type { Toy as EditorToy } from 'toy-editor';
import { SectionShape, type Toy } from '@/services/types';
import { circumferenceToDiameter } from '@/services/units';

/** Map a saved Toy (API domain) to the EditorToy the toy-editor store
 *  consumes when opening edit / copy flows. Sections are shallow-copied
 *  so editor mutations don't leak back into the source record. Reference
 *  dimensions are translated: circumference → diameter via π, snake
 *  field names → camel mm-suffixed names. */
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
