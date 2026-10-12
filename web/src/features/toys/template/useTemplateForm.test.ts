import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/toys/template/toyTemplates', () => ({
  TOY_TEMPLATES: [
    {
      id: 'slim-cone',
      name: 'Slim cone',
      totalLength: 130,
      insertableLength: 120,
      circumference: 40 * Math.PI,
      shape: {
        topSectionShape: 'CONE',
        bottomSectionShape: 'FLAT',
        sections: [
          { id: 0, order: 0, diameter: 40, height: 40 },
          { id: 1, order: 1, diameter: 32, height: 50 },
          { id: 2, order: 2, diameter: 20, height: 30 },
        ],
      },
    },
  ],
}));

import { Unit } from '@/features/preferences/units';
import { useTemplateForm } from '@/features/toys/template/useTemplateForm';

describe('useTemplateForm', () => {
  it('has no preview until a template is picked', () => {
    const { result } = renderHook(() => useTemplateForm(Unit.mm));
    expect(result.current.selectedTemplate).toBeNull();
    expect(result.current.previewToy).toBeNull();
  });

  it('builds the preview from the picked template and the entered sizes', () => {
    const { result } = renderHook(() => useTemplateForm(Unit.mm));
    act(() => result.current.selectTemplate('slim-cone'));
    expect(result.current.selectedTemplate?.name).toBe('Slim cone');
    expect(result.current.previewToy?.knownTotalMm).toBe(130);

    act(() => result.current.changeTotal('260'));
    expect(result.current.previewToy?.knownTotalMm).toBe(260);
    expect(result.current.insertableMm).toBe(240);
  });

  it('drops the preview while a size is missing', () => {
    const { result } = renderHook(() => useTemplateForm(Unit.mm));
    act(() => result.current.selectTemplate('slim-cone'));
    act(() => result.current.changeSize(''));
    expect(result.current.previewToy).toBeNull();
  });
});
