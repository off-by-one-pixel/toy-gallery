import type { Toy as EditorToy } from 'toy-editor';
import { TranslatableError } from '@/api/errors';
import { SectionShape, type ToyTemplate } from '@/api/types';
import { circumferenceToDiameter } from '@/features/preferences/units';

export function templateJsonToEditor(text: string): EditorToy {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new TranslatableError('templateJson.notJson', { detail: e instanceof Error ? e.message : String(e) });
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new TranslatableError('templateJson.notObject');
  }
  const t = parsed as Partial<ToyTemplate>;
  if (!t.shape || !Array.isArray(t.shape.sections) || t.shape.sections.length === 0) {
    throw new TranslatableError('templateJson.noSections');
  }
  return {
    sections: t.shape.sections.map((s, idx) => ({
      id: typeof s.id === 'number' ? s.id : idx,
      diameter: Number(s.diameter),
      height: Number(s.height),
      color: typeof s.color === 'string' ? s.color : undefined,
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
