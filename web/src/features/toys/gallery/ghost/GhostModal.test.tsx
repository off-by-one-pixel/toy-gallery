// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import en from '@/i18n/catalogs/en.json';
import type { Toy } from '@/api/types';
import GhostModal from '@/features/toys/gallery/ghost/GhostModal';
import { withAppProviders } from '@/test/render';
import type { GhostTarget } from '@/features/toys/gallery/ghost/ghosts';
import { makeGhost } from '@/test/fixtures';

const source = {
  brand: 'Acme',
  name: 'Ember',
  size: 'M',
  circumference: 136,
  insertableLength: 158,
} as unknown as Toy;

const ghost = makeGhost({ sourceName: 'Acme Ember M', circumference: 136, insertableLength: 158 });

const renderModal = (target: GhostTarget = { kind: 'new', source }) => {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(withAppProviders(<GhostModal target={target} onSave={onSave} onClose={onClose} />));
  return { onSave, onClose };
};

describe('GhostModal', () => {
  it('prefills the cloned dimensions and names the source', () => {
    renderModal();
    expect(screen.getByText(en.toy.ghost.modalTitleNew)).toBeTruthy();
    expect(screen.getByText('Cloned from Acme Ember M — adjust to the listing specs')).toBeTruthy();
    expect(screen.getByDisplayValue('136')).toBeTruthy();
    expect(screen.getByDisplayValue('158')).toBeTruthy();
  });

  it('saves the adjusted dimensions in mm', () => {
    const { onSave } = renderModal();
    fireEvent.change(screen.getByDisplayValue('136'), { target: { value: '140' } });
    fireEvent.change(screen.getByDisplayValue('158'), { target: { value: '165' } });
    fireEvent.click(screen.getByRole('button', { name: en.toy.ghost.add }));
    expect(onSave).toHaveBeenCalledWith({ circumference: 140, insertableLength: 165 });
  });

  it('disables saving while inputs are invalid', () => {
    const { onSave } = renderModal();
    fireEvent.change(screen.getByDisplayValue('136'), { target: { value: 'junk' } });
    const save = screen.getByRole('button', { name: en.toy.ghost.add });
    fireEvent.click(save);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('uses the edit labels and the stored source name when editing an existing ghost', () => {
    renderModal({ kind: 'edit', ghost });
    expect(screen.getByText(en.toy.ghost.modalTitleEdit)).toBeTruthy();
    expect(screen.getByText('Cloned from Acme Ember M — adjust to the listing specs')).toBeTruthy();
    expect(screen.getByRole('button', { name: en.common.save })).toBeTruthy();
  });
});
