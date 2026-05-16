import type { Toy as EditorToy, ToySection } from 'cone-editor';
import { SectionShape, type ToyTemplate } from './types';
import { circumferenceToDiameter, diameterToCircumference } from './units';

type ExportInput = Readonly<{
  sections: readonly ToySection[];
  topShape: SectionShape;
  bottomShape: SectionShape;
  insertableLengthMm: number | null;
  knownTotalMm: number | null;
  knownSizeMm: number | null;
}>;

/** Build a ToyTemplate-shaped object from the current editor state.
 *  `id`, `name`, and `description` are left blank for the author to fill
 *  in after pasting the JSON into toyTemplates.json. */
export function buildTemplateJson(input: ExportInput): string {
  const entry = {
    id: '',
    name: '',
    description: '',
    totalLength: input.knownTotalMm,
    insertableLength: input.insertableLengthMm,
    circumference: diameterToCircumference(input.knownSizeMm),
    shape: {
      topSectionShape: input.topShape,
      bottomSectionShape: input.bottomShape,
      sections: input.sections.map((s, idx) => ({
        id: s.id,
        order: idx,
        diameter: s.diameter,
        height: s.height,
        topCurveAngle: s.topCurveAngle,
        bottomCurveAngle: s.bottomCurveAngle,
      })),
    },
  };
  return JSON.stringify(entry, null, 2);
}

/** Parse a ToyTemplate JSON entry into an EditorToy ready to feed to
 *  `useToyStore.hydrate`. Throws with a user-readable message on bad input. */
export function parseTemplateJson(text: string): EditorToy {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`Not valid JSON: ${(e as Error).message}`);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Expected a JSON object.');
  }
  const t = parsed as Partial<ToyTemplate>;
  if (!t.shape || !Array.isArray(t.shape.sections) || t.shape.sections.length === 0) {
    throw new Error('Missing or empty shape.sections.');
  }
  return {
    sections: t.shape.sections.map((s, idx) => ({
      id: typeof s.id === 'number' ? s.id : idx,
      diameter: Number(s.diameter),
      height: Number(s.height),
      topCurveAngle: s.topCurveAngle,
      bottomCurveAngle: s.bottomCurveAngle,
    })),
    topShape: t.shape.topSectionShape ?? SectionShape.FLAT,
    bottomShape: t.shape.bottomSectionShape ?? SectionShape.FLAT,
    insertableLengthMm: t.insertableLength ?? null,
    knownTotalMm: t.totalLength ?? null,
    knownSizeMm: circumferenceToDiameter(t.circumference ?? null),
  };
}
