import type { Toy as EditorToy, ToySection } from 'toy-editor';
import { SectionShape, type ToyTemplate } from '@/api/types';
import { circumferenceToDiameter } from '@/features/preferences/units';

type Input = Readonly<{
  template: ToyTemplate;
  totalMm: number;
  maxDiameterMm: number;
}>;

export function templateToEditor({ template, totalMm, maxDiameterMm }: Input): EditorToy {
  const srcMaxDiameter = circumferenceToDiameter(template.circumference);
  if (srcMaxDiameter == null || srcMaxDiameter <= 0 || template.totalLength <= 0) {
    throw new Error(`Template "${template.id}" has invalid canonical dimensions.`);
  }

  const heightScale = totalMm / template.totalLength;
  const widthScale = maxDiameterMm / srcMaxDiameter;
  const insertableLengthMm = totalMm * (template.insertableLength / template.totalLength);

  const sections: ToySection[] = template.shape.sections.map((s) => ({
    id: s.id,
    diameter: s.diameter * widthScale,
    height: s.height * heightScale,
    topCurveAngle: s.topCurveAngle,
    bottomCurveAngle: s.bottomCurveAngle,
  }));

  return {
    sections,
    topShape: template.shape.topSectionShape ?? SectionShape.FLAT,
    bottomShape: template.shape.bottomSectionShape ?? SectionShape.FLAT,
    insertableLengthMm,
    knownTotalMm: totalMm,
    knownSizeMm: maxDiameterMm,
  };
}
