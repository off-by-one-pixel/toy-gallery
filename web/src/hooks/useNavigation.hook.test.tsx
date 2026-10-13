import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNavigation } from '@/hooks/useNavigation';

const push = vi.fn();
const replace = vi.fn();
let searchParams = new URLSearchParams();
let pathname = '/list/new';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => pathname,
  useSearchParams: () => searchParams,
}));

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  searchParams = new URLSearchParams();
  pathname = '/list/new';
});

describe('useNavigation', () => {
  it('exposes the pathname and reads params', () => {
    searchParams = new URLSearchParams('stage=template');
    const { result } = renderHook(() => useNavigation());
    expect(result.current.pathname).toBe('/list/new');
    expect(result.current.param('stage')).toBe('template');
    expect(result.current.param('missing')).toBeNull();
  });

  it('navigates and replaces plain hrefs through the router', () => {
    const { result } = renderHook(() => useNavigation());
    result.current.navigate('/list');
    expect(push).toHaveBeenCalledWith('/list');
    result.current.replace('/other');
    expect(replace).toHaveBeenCalledWith('/other');
  });

  it('builds the new URL by merging the update onto the current params', () => {
    searchParams = new URLSearchParams('stage=template');
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.updateParams({ stage: 'editor', dialog: null });
    });

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/list/new?stage=editor', { scroll: false });
  });

  it('routes through router.replace when { replace: true } is passed', () => {
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.updateParams({ stage: 'editor' }, { replace: true });
    });

    expect(push).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/list/new?stage=editor', { scroll: false });
  });

  it('chained updates within one event handler clobber each other', () => {
    searchParams = new URLSearchParams('stage=template');
    const { result } = renderHook(() => useNavigation());

    act(() => {
      result.current.updateParams({ stage: 'editor' });
      result.current.updateParams({ dialog: null });
    });

    expect(push).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenNthCalledWith(1, '/list/new?stage=editor', { scroll: false });
    expect(push).toHaveBeenNthCalledWith(2, '/list/new?stage=template', { scroll: false });
  });
});
