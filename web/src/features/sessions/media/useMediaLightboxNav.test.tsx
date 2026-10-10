import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useNavigation', async () => (await import('@/test/navigation')).navigationModule());

import { navState, resetNavigation, updateParamsMock } from '@/test/navigation';
import { useMediaLightboxNav } from '@/features/sessions/media/useMediaLightboxNav';

describe('useMediaLightboxNav', () => {
  beforeEach(() => {
    resetNavigation();
  });

  it('parses the lightbox param addressed to this session', () => {
    navState.search = 'lightbox=1:1';
    const { result } = renderHook(() => useMediaLightboxNav(1));
    expect(result.current.openIndex).toBe(1);
  });

  it.each(['lightbox=2:0', 'lightbox=junk', ''])('ignores foreign or malformed params (%s)', (search) => {
    navState.search = search;
    const { result } = renderHook(() => useMediaLightboxNav(1));
    expect(result.current.openIndex).toBeNull();
  });

  it('leaves the has-media filter intact when opening', () => {
    navState.search = 'media=1';
    const { result } = renderHook(() => useMediaLightboxNav(1));
    result.current.open(0);
    expect(new URLSearchParams(navState.search).get('media')).toBe('1');
  });

  it('opens by writing the session-scoped lightbox param', () => {
    const { result } = renderHook(() => useMediaLightboxNav(1));
    result.current.open(2);
    expect(updateParamsMock).toHaveBeenCalledWith({ lightbox: '1:2' });
  });

  it('closes by clearing the lightbox param', () => {
    const { result } = renderHook(() => useMediaLightboxNav(1));
    result.current.close({ replace: true });
    expect(updateParamsMock).toHaveBeenCalledWith({ lightbox: null }, { replace: true });
  });
});
