'use client';

import { useSearchParams } from 'next/navigation';

import { parseIntParam, type Update, useUrlUpdate } from '../useUrlNav';

const KEY = 'media';

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
  const update = useUrlUpdate();
  const openIndex = parseMediaParam(useSearchParams().get(KEY), sessionId);
  return {
    openIndex,
    open: (index: number) => update(mediaLightboxUpdates.open(sessionId, index)),
    close: (options?: Readonly<{ replace?: boolean }>) => update(mediaLightboxUpdates.close(), options),
  };
}
