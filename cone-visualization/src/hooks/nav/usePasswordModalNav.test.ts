import { describe, expect, it } from 'vitest';

import { passwordUpdates } from './usePasswordModalNav';

describe('passwordUpdates', () => {
  it('open sets modal=password', () => {
    expect(passwordUpdates.open()).toEqual({ modal: 'password' });
  });

  it('close nulls the modal key', () => {
    expect(passwordUpdates.close()).toEqual({ modal: null });
  });
});
