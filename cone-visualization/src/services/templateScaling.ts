import type { Toy as EditorToy, ToySection } from 'cone-editor';
import { SectionShape, type ToyTemplate } from './types';
import { circumferenceToDiameter } from './units';

export function scaleTemplate(template: ToyTemplate, targetTotalMm: number, targetMaxDiameterMm: number): EditorToy {
  const srcMaxDiameter = circumferenceToDiameter(template.circumference);
  if (srcMaxDiameter == null || srcMaxDiameter <= 0 || template.totalLength <= 0) {
    throw new Error(`Template "${template.id}" has invalid canonical dimensions.`);
  }

  const heightScale = targetTotalMm / template.totalLength;
  const widthScale = targetMaxDiameterMm / srcMaxDiameter;
  const targetInsertableMm = targetTotalMm * (template.insertableLength / template.totalLength);

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
    insertableLengthMm: targetInsertableMm,
    knownTotalMm: targetTotalMm,
    knownSizeMm: targetMaxDiameterMm,
  };
}
