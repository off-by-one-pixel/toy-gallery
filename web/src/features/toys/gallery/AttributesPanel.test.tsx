// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const editorState = vi.hoisted(() => ({
  current: {
    rows: [{ rowId: 1, key: 'Material', value: 'Silicone', fromSaved: true }],
    saveState: 'idle',
    keySuggestions: ['Firmness', 'Material'],
    valuesFor: vi.fn(() => ['Glass', 'Silicone']),
    beginEditing: vi.fn(),
    updateKey: vi.fn(),
    updateValue: vi.fn(),
    removeRow: vi.fn(),
    addRow: vi.fn(),
    commitChanges: vi.fn(),
  },
}));

vi.mock('@/features/toys/gallery/useAttributesEditor', () => ({
  useAttributesEditor: () => editorState.current,
}));

import en from '@/i18n/catalogs/en.json';
import { makeToy } from '@/test/fixtures';
import { withAppProviders } from '@/test/render';
import AttributesPanel from '@/features/toys/gallery/AttributesPanel';

describe('AttributesPanel autocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts loading suggestions when the panel becomes active', () => {
    render(withAppProviders(<AttributesPanel toy={makeToy({ id: 1 })} active />));
    expect(editorState.current.beginEditing).toHaveBeenCalled();
  });

  it('waits for focus when the panel is not active yet', () => {
    render(withAppProviders(<AttributesPanel toy={makeToy({ id: 1 })} active={false} />));
    expect(editorState.current.beginEditing).not.toHaveBeenCalled();
    screen.getByPlaceholderText(en.attributes.keyPlaceholder).focus();
    expect(editorState.current.beginEditing).toHaveBeenCalled();
  });

  it('offers the key suggestions through a shared datalist', () => {
    render(withAppProviders(<AttributesPanel toy={makeToy({ id: 1 })} />));
    const keyInput = screen.getByPlaceholderText(en.attributes.keyPlaceholder);
    const listId = keyInput.getAttribute('list');
    expect(listId).toBeTruthy();
    const options = [...document.querySelectorAll(`#${CSS.escape(listId as string)} option`)];
    expect(options.map((o) => o.getAttribute('value'))).toEqual(['Firmness', 'Material']);
  });

  it('offers the value suggestions for the row key through a per-row datalist', () => {
    render(withAppProviders(<AttributesPanel toy={makeToy({ id: 1 })} />));
    expect(editorState.current.valuesFor).toHaveBeenCalledWith('Material');
    const valueInput = screen.getByPlaceholderText(en.attributes.valuePlaceholder);
    const listId = valueInput.getAttribute('list');
    const options = [...document.querySelectorAll(`#${CSS.escape(listId as string)} option`)];
    expect(options.map((o) => o.getAttribute('value'))).toEqual(['Glass', 'Silicone']);
  });
});
