'use client';

import { parseIntParam, useNavigation } from '@/hooks/useNavigation';

const KEY = 'lightbox';

function parseMediaParam(raw: string | null, sessionId: number): number | null {
  if (!raw) return null;
  const [sid, idx] = raw.split(':');
  if (parseIntParam(sid) !== sessionId) return null;
  const index = parseIntParam(idx);
  return index !== null && index >= 0 ? index : null;
}

export function useMediaLightboxNav(sessionId: number) {
  const { param, updateParams: update } = useNavigation();
  const openIndex = parseMediaParam(param(KEY), sessionId);
  return {
    openIndex,
    open: (index: number) => update({ [KEY]: `${sessionId}:${index}` }),
    close: (options?: Readonly<{ replace?: boolean }>) => update({ [KEY]: null }, options),
  };
}
