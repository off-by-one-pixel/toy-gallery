'use client';

import { type Update, useEnumParam, useUrlUpdate } from '../useUrlNav';

const VALUES = ['password'] as const;

/** Pure URL-update producers for the change-password modal. */
export const passwordUpdates = {
  open: (): Update => ({ modal: 'password' }),
  close: (): Update => ({ modal: null }),
};

/** Chrome-level modal: shares the `modal` search param with the toy
 *  modal kinds. They're mutually exclusive, so the same key safely
 *  carries both. */
export function usePasswordModalNav() {
  const update = useUrlUpdate();
  const isOpen = useEnumParam('modal', VALUES) === 'password';
  return {
    isOpen,
    open: () => update(passwordUpdates.open()),
    close: () => update(passwordUpdates.close()),
  };
}
