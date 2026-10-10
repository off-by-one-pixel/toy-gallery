import { describe, expect, it } from 'vitest';

import { SectionShape, type ToyTemplate } from '@/api/types';
import { templateToEditor } from '@/features/toys/converters/template';

const canonical: ToyTemplate = {
  id: 'slim-cone',
  name: 'Slim cone',
  shape: {
    topSectionShape: SectionShape.CONE,
    bottomSectionShape: SectionShape.FLAT,
    sections: [
      { id: 0, order: 0, diameter: 40, height: 40, topCurveAngle: 90 },
      { id: 1, order: 1, diameter: 32, height: 50 },
      { id: 2, order: 2, diameter: 20, height: 30 },
    ],
  },
  totalLength: 130,
  insertableLength: 120,
  circumference: 40 * Math.PI,
};

describe('templateToEditor', () => {
  it('is identity when target matches canonical dimensions', () => {
    const out = templateToEditor({ template: canonical, totalMm: 130, maxDiameterMm: 40 });
    expect(out.sections.map((s) => s.diameter)).toEqual([40, 32, 20]);
    expect(out.sections.map((s) => s.height)).toEqual([40, 50, 30]);
  });

  it('scales section heights by totalMm / template.totalLength', () => {
    const out = templateToEditor({ template: canonical, totalMm: 260, maxDiameterMm: 40 });
    expect(out.sections.map((s) => s.height)).toEqual([80, 100, 60]);
  });

  it('scales section diameters by maxDiameterMm / canonical diameter', () => {
    const out = templateToEditor({ template: canonical, totalMm: 130, maxDiameterMm: 80 });
    expect(out.sections.map((s) => s.diameter)).toEqual([80, 64, 40]);
  });

  it('derives insertableLengthMm from the template insertable/total ratio', () => {
    const out = templateToEditor({ template: canonical, totalMm: 260, maxDiameterMm: 40 });
    expect(out.insertableLengthMm).toBeCloseTo(240);
  });

  it('stamps target totalMm and maxDiameterMm on the editor toy', () => {
    const out = templateToEditor({ template: canonical, totalMm: 200, maxDiameterMm: 50 });
    expect(out.knownTotalMm).toBe(200);
    expect(out.knownSizeMm).toBe(50);
  });

  it('preserves per-section curve angles verbatim', () => {
    const out = templateToEditor({ template: canonical, totalMm: 260, maxDiameterMm: 80 });
    expect(out.sections[0].topCurveAngle).toBe(90);
    expect(out.sections[1].topCurveAngle).toBeUndefined();
  });

  it('translates the section shape envelope with FLAT default', () => {
    const out = templateToEditor({ template: canonical, totalMm: 130, maxDiameterMm: 40 });
    expect(out.topShape).toBe(SectionShape.CONE);
    expect(out.bottomShape).toBe(SectionShape.FLAT);
    const naked: ToyTemplate = {
      ...canonical,
      shape: { sections: canonical.shape.sections },
    };
    const out2 = templateToEditor({ template: naked, totalMm: 130, maxDiameterMm: 40 });
    expect(out2.topShape).toBe(SectionShape.FLAT);
    expect(out2.bottomShape).toBe(SectionShape.FLAT);
  });

  it('throws when canonical circumference is zero', () => {
    expect(() =>
      templateToEditor({ template: { ...canonical, circumference: 0 }, totalMm: 130, maxDiameterMm: 40 }),
    ).toThrow(/invalid canonical dimensions/);
  });

  it('throws when canonical totalLength is zero', () => {
    expect(() =>
      templateToEditor({ template: { ...canonical, totalLength: 0 }, totalMm: 130, maxDiameterMm: 40 }),
    ).toThrow(/invalid canonical dimensions/);
  });
});
