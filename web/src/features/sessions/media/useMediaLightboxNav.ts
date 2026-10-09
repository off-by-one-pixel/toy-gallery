'use client';

import { parseIntParam, type Update, useNavigation } from '@/hooks/useNavigation';

const KEY = 'lightbox';

export const mediaLightboxUpdates = {
  open: (sessionId: number, index: number): Update => ({ [KEY]: `${sessionId}:${index}` }),
  close: (): Update => ({ [KEY]: null }),
};

export function parseMediaParam(raw: string | null, sessionId: number): number | null {
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
    open: (index: number) => update(mediaLightboxUpdates.open(sessionId, index)),
    close: (options?: Readonly<{ replace?: boolean }>) => update(mediaLightboxUpdates.close(), options),
  };
}
