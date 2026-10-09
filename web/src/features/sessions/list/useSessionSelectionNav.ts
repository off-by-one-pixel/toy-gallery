'use client';

import { useEffect, useRef } from 'react';

import { parseIntParam, type Update, useNavigation } from '@/hooks/useNavigation';

const KEY = 'id';

const REPLACE = { replace: true } as const;

const sessionSelectionUpdates = {
  select: (id: number): Update => ({ [KEY]: String(id) }),
  clear: (): Update => ({ [KEY]: null }),
};

export function useSessionSelectionNav(loadedIds: readonly number[]) {
  const { param, updateParams: update } = useNavigation();
  const requested = parseIntParam(param(KEY));
  const selectedId = requested !== null && loadedIds.includes(requested) ? requested : null;
  const selectedRowRef = useRef<HTMLDivElement>(null);
  const arrivalScrollPending = useRef(true);

  useEffect(() => {
    if (selectedId === null || !arrivalScrollPending.current) return;
    arrivalScrollPending.current = false;
    selectedRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [selectedId]);

  return {
    selectedId,
    selectedRowRef,
    toggle: (id: number) => {
      arrivalScrollPending.current = false;
      update(id === selectedId ? sessionSelectionUpdates.clear() : sessionSelectionUpdates.select(id), REPLACE);
    },
    clear: () => update(sessionSelectionUpdates.clear(), REPLACE),
  };
}
