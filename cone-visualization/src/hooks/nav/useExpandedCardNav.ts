'use client';

import { useIntParam, useUrlUpdate } from '../useUrlNav';

export function useExpandedCardNav() {
  const update = useUrlUpdate();
  const openCardId = useIntParam('details');
  return {
    openCardId,
    toggle: (id: number) => update({ details: openCardId === id ? null : String(id) }),
  };
}
