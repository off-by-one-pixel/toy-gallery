'use client';

import { parseEnumParam, parseIntParam, type Update, useNavigation } from '@/hooks/useNavigation';

const KINDS = ['new', 'edit', 'copy'] as const;
export type ToyModalKind = (typeof KINDS)[number];

const CLEAR: Update = {
  modal: null,
  toyId: null,
  stage: null,
  step: null,
  dialog: null,
};

/** Pure URL-update producers for the toy modal lifecycle. Exported so
 *  unit tests can verify the parameter-key mapping without rendering
 *  the hook. */
export const toyModalUpdates = {
  openNew: (): Update => ({ ...CLEAR, modal: 'new', stage: 'template', step: 'template' }),
  openEdit: (id: number): Update => ({ ...CLEAR, modal: 'edit', toyId: String(id) }),
  openCopy: (id: number): Update => ({ ...CLEAR, modal: 'copy', toyId: String(id) }),
  close: (): Update => ({ ...CLEAR }),
};

const REPLACE = { replace: true } as const;

export function useToyModalNav() {
  const { param, updateParams: update } = useNavigation();
  return {
    kind: parseEnumParam<ToyModalKind>(param('modal'), KINDS),
    toyId: parseIntParam(param('toyId')),
    openNew: () => update(toyModalUpdates.openNew(), REPLACE),
    openEdit: (id: number) => update(toyModalUpdates.openEdit(id), REPLACE),
    openCopy: (id: number) => update(toyModalUpdates.openCopy(id), REPLACE),
    close: () => update(toyModalUpdates.close(), REPLACE),
  };
}
