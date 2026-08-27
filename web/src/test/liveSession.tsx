import { vi } from 'vitest';

import { fetchLiveSession } from '@/api';
import type { Session } from '@/api/types';
import { useLiveSession } from '@/features/sessions/live/useLiveSession';

export const liveSessionState: { current: Session | null } = { current: null };

export const stubLiveSession = () =>
  vi.mocked(fetchLiveSession).mockImplementation(async () => liveSessionState.current);

export function LiveStartProbe() {
  const { liveSession, isLoaded, start } = useLiveSession();
  const label = () => {
    if (!isLoaded) return 'loading';
    return liveSession ? `live:${liveSession.id}` : 'idle';
  };
  return (
    <button type="button" onClick={() => void start()}>
      {label()}
    </button>
  );
}
