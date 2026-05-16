'use client';

import { useEnumParam, useIntParam, useUrlUpdate } from '../useUrlNav';

const KINDS = ['new', 'edit', 'copy'] as const;
export type ToyModalKind = (typeof KINDS)[number];

const CLEAR: Record<string, string | null> = {
  modal: null,
  toyId: null,
  stage: null,
  step: null,
  dialog: null,
};

export function useToyModalNav() {
  const update = useUrlUpdate();
  return {
    kind: useEnumParam<ToyModalKind>('modal', KINDS),
    toyId: useIntParam('toyId'),
    openNew: () => update({ ...CLEAR, modal: 'new', stage: 'template', step: 'template' }),
    openEdit: (id: number) => update({ ...CLEAR, modal: 'edit', toyId: String(id) }),
    openCopy: (id: number) => update({ ...CLEAR, modal: 'copy', toyId: String(id) }),
    close: () => update(CLEAR),
  };
}
