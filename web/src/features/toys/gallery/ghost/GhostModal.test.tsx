// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import en from '@/i18n/catalogs/en.json';
import { GirthProvider } from '@/features/preferences/GirthProvider';
import { UnitProvider } from '@/features/preferences/UnitProvider';
import GhostModal from '@/features/toys/gallery/ghost/GhostModal';

const renderModal = (overrides: Partial<React.ComponentProps<typeof GhostModal>> = {}) => {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <UnitProvider>
        <GirthProvider>
          <GhostModal
            initial={{ circumference: 136, insertableLength: 158 }}
            sourceName="Acme Ember M"
            isEdit={false}
            onSave={onSave}
            onClose={onClose}
            {...overrides}
          />
        </GirthProvider>
      </UnitProvider>
    </NextIntlClientProvider>,
  );
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

  it('uses the edit labels when editing an existing ghost', () => {
    renderModal({ isEdit: true });
    expect(screen.getByText(en.toy.ghost.modalTitleEdit)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.common.save })).toBeTruthy();
  });
});
