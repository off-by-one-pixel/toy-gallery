import { describe, expect, it } from 'vitest';

import { SectionShape } from '@/services/types';
import { templateJsonToEditor } from './templateJson';

const fullEntry = {
  id: 'slim-cone',
  name: 'Slim cone',
  description: '',
  totalLength: 130,
  insertableLength: 120,
  circumference: 40 * Math.PI,
  shape: {
    topSectionShape: SectionShape.CONE,
    bottomSectionShape: SectionShape.FLAT,
    sections: [
      { id: 0, order: 0, diameter: 40, height: 40, topCurveAngle: 90 },
      { id: 1, order: 1, diameter: 32, height: 50 },
    ],
  },
};

describe('templateJsonToEditor', () => {
  it('parses a well-formed template entry into an EditorToy', () => {
    const out = templateJsonToEditor(JSON.stringify(fullEntry));
    expect(out.sections.map((s) => s.diameter)).toEqual([40, 32]);
    expect(out.sections.map((s) => s.height)).toEqual([40, 50]);
    expect(out.topShape).toBe(SectionShape.CONE);
    expect(out.bottomShape).toBe(SectionShape.FLAT);
  });

  it('converts circumference to diameter for knownSizeMm', () => {
    const out = templateJsonToEditor(JSON.stringify(fullEntry));
    expect(out.knownSizeMm).toBeCloseTo(40);
  });

  it('preserves per-section curve angles', () => {
    const out = templateJsonToEditor(JSON.stringify(fullEntry));
    expect(out.sections[0].topCurveAngle).toBe(90);
    expect(out.sections[1].topCurveAngle).toBeUndefined();
  });

  it('defaults missing topSectionShape / bottomSectionShape to FLAT', () => {
    const out = templateJsonToEditor(JSON.stringify({ ...fullEntry, shape: { sections: fullEntry.shape.sections } }));
    expect(out.topShape).toBe(SectionShape.FLAT);
    expect(out.bottomShape).toBe(SectionShape.FLAT);
  });

  it('falls back to the array index when a section id is missing', () => {
    const out = templateJsonToEditor(
      JSON.stringify({
        ...fullEntry,
        shape: {
          ...fullEntry.shape,
          sections: [
            { diameter: 40, height: 30 },
            { diameter: 20, height: 20 },
          ],
        },
      }),
    );
    expect(out.sections.map((s) => s.id)).toEqual([0, 1]);
  });

  it('passes null insertable/total/circumference through as nulls', () => {
    const out = templateJsonToEditor(
      JSON.stringify({ ...fullEntry, insertableLength: null, totalLength: null, circumference: null }),
    );
    expect(out.insertableLengthMm).toBeNull();
    expect(out.knownTotalMm).toBeNull();
    expect(out.knownSizeMm).toBeNull();
  });

  it('throws with a JSON-syntax message on invalid JSON', () => {
    expect(() => templateJsonToEditor('{ not json')).toThrow(/Not valid JSON/);
  });

  it('throws when the root is not an object', () => {
    expect(() => templateJsonToEditor('"a string"')).toThrow(/Expected a JSON object/);
  });

  it('throws when shape.sections is missing', () => {
    expect(() =>
      templateJsonToEditor(JSON.stringify({ ...fullEntry, shape: { topSectionShape: SectionShape.CONE } })),
    ).toThrow(/Missing or empty shape\.sections/);
  });

  it('throws on an empty sections array', () => {
    expect(() =>
      templateJsonToEditor(JSON.stringify({ ...fullEntry, shape: { ...fullEntry.shape, sections: [] } })),
    ).toThrow(/Missing or empty shape\.sections/);
  });
});
