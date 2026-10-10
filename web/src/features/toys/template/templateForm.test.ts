import { describe, expect, it } from 'vitest';

import {
  initialTemplateFormState,
  selectInsertableMm,
  selectMaxDiameterMm,
  selectTotalMm,
  templateFormReducer,
  templatePreviewToy,
  type TemplateFormState,
} from '@/features/toys/template/templateForm';
import { SectionShape, type ToyTemplate } from '@/api/types';
import { Unit } from '@/features/preferences/units';

const TEMPLATE: ToyTemplate = {
  id: 'slim-cone',
  name: 'Slim cone',
  totalLength: 130,
  insertableLength: 120,
  circumference: 40 * Math.PI,
  shape: {
    topSectionShape: SectionShape.CONE,
    bottomSectionShape: SectionShape.FLAT,
    sections: [
      { id: 0, order: 0, diameter: 40, height: 40 },
      { id: 1, order: 1, diameter: 32, height: 50 },
      { id: 2, order: 2, diameter: 20, height: 30 },
    ],
  },
};

describe('selectors', () => {
  const state: TemplateFormState = {
    selectedId: TEMPLATE.id,
    totalInput: '130',
    insertableInput: '120',
    sizeMode: 'diameter',
    sizeInput: '40',
  };

  it('selectTotalMm parses the total input', () => {
    expect(selectTotalMm(state, Unit.mm)).toBe(130);
  });

  it('selectInsertableMm parses the insertable input', () => {
    expect(selectInsertableMm(state, Unit.mm)).toBe(120);
  });

  it('selectMaxDiameterMm reads the size input as diameter when sizeMode is diameter', () => {
    expect(selectMaxDiameterMm(state, Unit.mm)).toBe(40);
  });

  it('selectMaxDiameterMm converts via π when sizeMode is circumference', () => {
    const c = { ...state, sizeMode: 'circumference' as const, sizeInput: String(40 * Math.PI) };
    expect(selectMaxDiameterMm(c, Unit.mm)).toBeCloseTo(40);
  });

  it('selectMaxDiameterMm returns null when the input is invalid', () => {
    expect(selectMaxDiameterMm({ ...state, sizeInput: '' }, Unit.mm)).toBeNull();
  });
});

describe('templatePreviewToy', () => {
  it('returns an EditorToy at the template canonical dimensions', () => {
    const preview = templatePreviewToy(TEMPLATE);
    expect(preview.sections.map((s) => s.diameter)).toEqual([40, 32, 20]);
    expect(preview.insertableLengthMm).toBeCloseTo(TEMPLATE.insertableLength);
    expect(preview.knownTotalMm).toBe(TEMPLATE.totalLength);
  });
});

describe('templateFormReducer', () => {
  describe('select-template', () => {
    it('records the selected id and seeds inputs from the template canonical dims', () => {
      const out = templateFormReducer(initialTemplateFormState, {
        type: 'select-template',
        template: TEMPLATE,
        unit: Unit.mm,
      });
      expect(out.selectedId).toBe(TEMPLATE.id);
      expect(out.totalInput).toBe('130');
      expect(out.insertableInput).toBe('120');
      expect(out.sizeInput).toBe('40');
    });

    it('seeds sizeInput as circumference when current sizeMode is circumference', () => {
      const seeded: TemplateFormState = { ...initialTemplateFormState, sizeMode: 'circumference' };
      const out = templateFormReducer(seeded, { type: 'select-template', template: TEMPLATE, unit: Unit.mm });
      expect(out.sizeInput).toBe('126');
    });
  });

  describe('change-total', () => {
    const base: TemplateFormState = {
      selectedId: TEMPLATE.id,
      totalInput: '130',
      insertableInput: '120',
      sizeMode: 'diameter',
      sizeInput: '40',
    };

    it('updates totalInput and derives insertableInput via the template ratio', () => {
      const out = templateFormReducer(base, {
        type: 'change-total',
        value: '260',
        selectedTemplate: TEMPLATE,
        unit: Unit.mm,
      });
      expect(out.totalInput).toBe('260');
      expect(out.insertableInput).toBe('240');
    });

    it('updates only totalInput when no template is selected', () => {
      const out = templateFormReducer(initialTemplateFormState, {
        type: 'change-total',
        value: '200',
        selectedTemplate: null,
        unit: Unit.mm,
      });
      expect(out.totalInput).toBe('200');
      expect(out.insertableInput).toBe('');
    });

    it('keeps a half-typed string without deriving when the value is unparseable', () => {
      const out = templateFormReducer(base, {
        type: 'change-total',
        value: '',
        selectedTemplate: TEMPLATE,
        unit: Unit.mm,
      });
      expect(out.totalInput).toBe('');
      expect(out.insertableInput).toBe('120');
    });
  });

  describe('change-insertable', () => {
    it('updates insertableInput and derives totalInput via the inverse ratio', () => {
      const out = templateFormReducer(
        { ...initialTemplateFormState, selectedId: TEMPLATE.id, totalInput: '130', insertableInput: '120' },
        { type: 'change-insertable', value: '240', selectedTemplate: TEMPLATE, unit: Unit.mm },
      );
      expect(out.insertableInput).toBe('240');
      expect(out.totalInput).toBe('260');
    });
  });

  describe('change-size', () => {
    it('updates sizeInput verbatim', () => {
      const out = templateFormReducer(initialTemplateFormState, { type: 'change-size', value: '45.5' });
      expect(out.sizeInput).toBe('45.5');
    });
  });

  describe('change-size-mode', () => {
    const base: TemplateFormState = {
      ...initialTemplateFormState,
      sizeMode: 'diameter',
      sizeInput: '40',
    };

    it('is a no-op when the requested mode matches the current one', () => {
      const out = templateFormReducer(base, { type: 'change-size-mode', mode: 'diameter', unit: Unit.mm });
      expect(out).toBe(base);
    });

    it('switches diameter → circumference by multiplying by π', () => {
      const out = templateFormReducer(base, { type: 'change-size-mode', mode: 'circumference', unit: Unit.mm });
      expect(out.sizeMode).toBe('circumference');
      expect(Number(out.sizeInput)).toBeCloseTo(40 * Math.PI, 0);
    });

    it('switches circumference → diameter by dividing by π', () => {
      const c = { ...base, sizeMode: 'circumference' as const, sizeInput: String(40 * Math.PI) };
      const out = templateFormReducer(c, { type: 'change-size-mode', mode: 'diameter', unit: Unit.mm });
      expect(out.sizeMode).toBe('diameter');
      expect(Number(out.sizeInput)).toBeCloseTo(40, 0);
    });

    it('changes mode but keeps an unparseable sizeInput unchanged', () => {
      const out = templateFormReducer(
        { ...base, sizeInput: '' },
        { type: 'change-size-mode', mode: 'circumference', unit: Unit.mm },
      );
      expect(out.sizeMode).toBe('circumference');
      expect(out.sizeInput).toBe('');
    });
  });
});
