import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useNavigation', async () => (await import('@/test/navigation')).navigationModule());

import { navState, resetNavigation, updateParamsMock } from '@/test/navigation';
import { selectedSessionHref, useSessionSelectionNav } from '@/features/sessions/list/useSessionSelectionNav';
import { routes } from '@/routes';

const LOADED = [1, 2];

const renderSelection = (loadedIds: readonly number[] = LOADED) => {
  const hook = renderHook((ids: readonly number[]) => useSessionSelectionNav(ids), { initialProps: loadedIds });
  const scrollIntoView = vi.fn();
  hook.result.current.selectedRowRef.current = { scrollIntoView } as unknown as HTMLDivElement;
  return { ...hook, scrollIntoView };
};

describe('useSessionSelectionNav', () => {
  beforeEach(() => {
    resetNavigation();
  });

  it('selects the loaded session named by the URL', () => {
    navState.search = 'id=2';
    const { result } = renderSelection();
    expect(result.current.selectedId).toBe(2);
  });

  it('builds a sessions-page link that selects the session', () => {
    const href = selectedSessionHref(2);
    expect(href.startsWith(`${routes.sessions.list}?`)).toBe(true);
    navState.search = href.split('?')[1];
    const { result } = renderSelection();
    expect(result.current.selectedId).toBe(2);
  });

  it.each(['id=9', 'id=junk', ''])('selects nothing for unloaded or malformed ids (%s)', (search) => {
    navState.search = search;
    const { result } = renderSelection();
    expect(result.current.selectedId).toBeNull();
  });

  it('selects another session in place of the history entry', () => {
    navState.search = 'id=1';
    const { result } = renderSelection();
    result.current.toggle(2);
    expect(updateParamsMock).toHaveBeenCalledWith({ id: '2' }, { replace: true });
  });

  it('deselects when toggling the selected session', () => {
    navState.search = 'id=1';
    const { result } = renderSelection();
    result.current.toggle(1);
    expect(updateParamsMock).toHaveBeenCalledWith({ id: null }, { replace: true });
  });

  it('clears the selection', () => {
    navState.search = 'id=1';
    const { result } = renderSelection();
    result.current.clear();
    expect(updateParamsMock).toHaveBeenCalledWith({ id: null }, { replace: true });
  });

  it('scrolls to the URL-selected session once, when it first loads', () => {
    navState.search = 'id=2';
    const { rerender, scrollIntoView } = renderSelection([]);
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(LOADED);
    rerender([...LOADED, 3]);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
  });

  it('does not scroll to a session selected by clicking', () => {
    const { result, rerender, scrollIntoView } = renderSelection();
    act(() => result.current.toggle(1));
    rerender(LOADED);
    expect(result.current.selectedId).toBe(1);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
