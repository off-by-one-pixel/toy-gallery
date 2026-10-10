import { describe, expect, it } from 'vitest';

import { toyModalUpdates } from '@/features/toys/gallery/useToyModalNav';

describe('toyModalUpdates', () => {
  it('openNew clears the modal slot and seeds the wizard at step 1', () => {
    expect(toyModalUpdates.openNew()).toEqual({
      modal: 'new',
      toyId: null,
      stage: 'template',
      step: 'template',
      dialog: null,
    });
  });

  it('openEdit sets modal=edit and serializes toyId', () => {
    expect(toyModalUpdates.openEdit(42)).toEqual({
      modal: 'edit',
      toyId: '42',
      stage: null,
      step: null,
      dialog: null,
    });
  });

  it('openCopy sets modal=copy', () => {
    expect(toyModalUpdates.openCopy(7).modal).toBe('copy');
    expect(toyModalUpdates.openCopy(7).toyId).toBe('7');
  });

  it('close nulls every modal-related key', () => {
    const update = toyModalUpdates.close();
    expect(update.modal).toBeNull();
    expect(update.toyId).toBeNull();
    expect(update.stage).toBeNull();
    expect(update.step).toBeNull();
    expect(update.dialog).toBeNull();
  });
});
