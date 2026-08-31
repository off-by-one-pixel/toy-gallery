// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useNow } from '@/hooks/useNow';

describe('useNow', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates on every tick', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNow(1000));
    const start = result.current.getTime();

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.getTime() - start).toBe(3000);
  });

  it('stays frozen when disabled', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNow(1000, false));
    const start = result.current.getTime();
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.getTime() - start).toBe(0);
  });
});
