'use client';

import { useEffect, useRef } from 'react';

import { parseIntParam, useNavigation } from '@/hooks/useNavigation';
import { routeParams } from '@/routes';

const KEY = routeParams.sessionId;

const REPLACE = { replace: true } as const;

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
      update({ [KEY]: id === selectedId ? null : String(id) }, REPLACE);
    },
    clear: () => update({ [KEY]: null }, REPLACE),
  };
}
