'use client';

import { useMemo } from 'react';
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

export const toyModalUpdates = {
  openNew: (): Update => ({ ...CLEAR, modal: 'new', stage: 'template', step: 'template' }),
  openEdit: (id: number): Update => ({ ...CLEAR, modal: 'edit', toyId: String(id) }),
  openCopy: (id: number): Update => ({ ...CLEAR, modal: 'copy', toyId: String(id) }),
  close: (): Update => ({ ...CLEAR }),
};

const REPLACE = { replace: true } as const;

export function useToyModalNav() {
  const { param, updateParams: update } = useNavigation();
  const kind = parseEnumParam<ToyModalKind>(param('modal'), KINDS);
  const toyId = parseIntParam(param('toyId'));
  return useMemo(
    () => ({
      kind,
      toyId,
      openNew: () => update(toyModalUpdates.openNew(), REPLACE),
      openEdit: (id: number) => update(toyModalUpdates.openEdit(id), REPLACE),
      openCopy: (id: number) => update(toyModalUpdates.openCopy(id), REPLACE),
      close: () => update(toyModalUpdates.close(), REPLACE),
    }),
    [kind, toyId, update],
  );
}
