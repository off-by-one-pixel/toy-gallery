// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useNavigation', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/useNavigation')>();
  const { testNavigation } = await import('@/test/navigation');
  return { ...original, useNavigation: () => testNavigation() };
});

import { navState, resetNavigation, updateParamsMock } from '@/test/navigation';
import { useMediaLightboxNav } from '@/features/sessions/media/useMediaLightboxNav';

describe('useMediaLightboxNav', () => {
  beforeEach(() => {
    resetNavigation();
  });

  it('parses the media param addressed to this session', () => {
    navState.search = 'media=1:1';
    const { result } = renderHook(() => useMediaLightboxNav(1));
    expect(result.current.openIndex).toBe(1);
  });

  it.each(['media=2:0', 'media=junk', ''])('ignores foreign or malformed params (%s)', (search) => {
    navState.search = search;
    const { result } = renderHook(() => useMediaLightboxNav(1));
    expect(result.current.openIndex).toBeNull();
  });

  it('opens by writing the session-scoped media param', () => {
    const { result } = renderHook(() => useMediaLightboxNav(1));
    result.current.open(2);
    expect(updateParamsMock).toHaveBeenCalledWith({ media: '1:2' });
  });

  it('closes by clearing the media param', () => {
    const { result } = renderHook(() => useMediaLightboxNav(1));
    result.current.close({ replace: true });
    expect(updateParamsMock).toHaveBeenCalledWith({ media: null }, { replace: true });
  });
});
