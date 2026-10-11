import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TEST_LABELS } from '../../test/labels';
import ToyEditor from './ToyEditor';
import type { ToyEditorLabels } from './editor/labels';
import { useEditorLabels } from './editor/labels';

const MM = { id: 'mm', factor: 1, decimals: 0 };

describe('ToyEditor', () => {
  it('renders the canvas, cap-shape selectors, and known-measurements row', () => {
    render(<ToyEditor unit={MM} labels={TEST_LABELS} />);

    expect(screen.getByRole('combobox', { name: /top shape/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /bottom shape/i })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /add section/i })).toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: /insertable/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /total/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /snap/i })).toBeInTheDocument();

    expect(document.querySelector('.toy-editor-svg')).toBeTruthy();
  });

  it('renders the labels it is given', () => {
    const labels: ToyEditorLabels = {
      ...TEST_LABELS,
      topShape: 'Forme du haut',
      knownMeasurements: 'Mesures connues',
      snap: 'Aimanter',
      shapes: { ...TEST_LABELS.shapes, CONE: 'Cône' },
      addSection: '+ Ajouter une section',
      addReferenceImage: 'Ajouter une image de référence',
    };
    render(<ToyEditor unit={MM} labels={labels} />);

    expect(screen.getByRole('combobox', { name: 'Forme du haut' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Mesures connues' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Aimanter' })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: /Cône/ })).toHaveLength(2);
    expect(screen.getByRole('button', { name: '+ Ajouter une section' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter une image de référence' })).toBeInTheDocument();
    expect(screen.queryByText(/known measurements/i)).toBeNull();
  });

  it('offers an image-only file picker for a reference image', () => {
    render(<ToyEditor unit={MM} labels={TEST_LABELS} />);

    expect(screen.getByRole('button', { name: /add reference image/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/reference image file/i)).toHaveAttribute('accept', 'image/*');
  });

  it('refuses to read labels outside the editor', () => {
    const Orphan = () => <>{useEditorLabels().snap}</>;
    expect(() => render(<Orphan />)).toThrow(/useEditorLabels must be used within/);
  });
});
