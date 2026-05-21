import type { Toy as EditorToy } from 'toy-editor';
import { SectionShape, type ToyTemplate } from '../types';
import { circumferenceToDiameter } from '../units';

/** Parse a ToyTemplate-shaped JSON string and translate it into an
 *  EditorToy ready for `useToyStore.hydrate`. Throws with a
 *  user-readable message on bad input — the dialog surfaces it inline. */
export function templateJsonToEditor(text: string): EditorToy {
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
