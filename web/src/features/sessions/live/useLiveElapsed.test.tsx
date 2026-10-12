import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useLiveElapsed } from '@/features/sessions/live/useLiveElapsed';
import { withAppProviders } from '@/test/render';

const wrapper = ({ children }: { children: ReactNode }) => withAppProviders(children);

describe('useLiveElapsed', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports nothing when no session is live', () => {
    const { result } = renderHook(() => useLiveElapsed(null), { wrapper });
    expect(result.current.elapsed).toBeNull();
  });

  it('formats the time since the start and ticks every second', () => {
    vi.useFakeTimers();
    const startedAt = new Date(Date.now() - 65 * 60_000).toISOString();
    const { result } = renderHook(() => useLiveElapsed(startedAt), { wrapper });
    expect(result.current.elapsed).toBe('1h 5m 00s');

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(result.current.elapsed).toBe('1h 5m 03s');
    expect(result.current.now.getTime() - new Date(startedAt).getTime()).toBe(65 * 60_000 + 3_000);
  });
});
