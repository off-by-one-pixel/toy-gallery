'use client';

import { useEnumParam, useUrlUpdate } from '../useUrlNav';

const VALUES = ['password'] as const;

/** Chrome-level modal: shares the `modal` search param with the toy
 *  modal kinds. They're mutually exclusive, so the same key safely
 *  carries both. */
export function usePasswordModalNav() {
  const update = useUrlUpdate();
  const isOpen = useEnumParam('modal', VALUES) === 'password';
  return {
    isOpen,
    open: () => update({ modal: 'password' }),
    close: () => update({ modal: null }),
  };
}
