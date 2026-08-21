// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUrlUpdate } from '@/hooks/useUrlNav';

const push = vi.fn();
const replace = vi.fn();
let searchParams = new URLSearchParams();
let pathname = '/sessions/new';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => pathname,
  useSearchParams: () => searchParams,
}));

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  searchParams = new URLSearchParams();
  pathname = '/sessions/new';
});

describe('useUrlUpdate', () => {
  it('builds the new URL by merging the update onto the current params', () => {
    searchParams = new URLSearchParams('stage=template');
    const { result } = renderHook(() => useUrlUpdate());

    act(() => {
      result.current({ stage: 'editor', dialog: null });
    });

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/sessions/new?stage=editor', { scroll: false });
  });

  it('routes through router.replace when { replace: true } is passed', () => {
    const { result } = renderHook(() => useUrlUpdate());

    act(() => {
      result.current({ stage: 'editor' }, { replace: true });
    });

    expect(push).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/sessions/new?stage=editor', { scroll: false });
  });

  // Documents the footgun behind the "Start blank doesn't advance" bug:
  // both calls capture the same useSearchParams() snapshot, so the second
  // push rebuilds the URL from the original params — silently overwriting
  // the first. Always batch related changes into one update().
  it('chained calls within one event handler clobber each other', () => {
    searchParams = new URLSearchParams('stage=template');
    const { result } = renderHook(() => useUrlUpdate());

    act(() => {
      result.current({ stage: 'editor' });
      result.current({ dialog: null });
    });

    expect(push).toHaveBeenCalledTimes(2);
    // First push moved us to editor…
    expect(push).toHaveBeenNthCalledWith(1, '/sessions/new?stage=editor', { scroll: false });
    // …but the second push rebuilt from the unchanged snapshot, reverting stage.
    expect(push).toHaveBeenNthCalledWith(2, '/sessions/new?stage=template', { scroll: false });
  });
});
