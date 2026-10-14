import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useNavigation', async () => (await import('@/test/navigation')).navigationModule());

import { navState, resetNavigation, updateParamsMock } from '@/test/navigation';
import { useSessionSelectionNav } from '@/features/sessions/list/useSessionSelectionNav';
import { routeParams, routes } from '@/routes';

const LOADED = [1, 2];

const KEY = routeParams.sessionId;

const selecting = (id: number | string) => `${KEY}=${id}`;

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
    navState.search = selecting(2);
    const { result } = renderSelection();
    expect(result.current.selectedId).toBe(2);
  });

  it('selects the session linked by the sessions route', () => {
    navState.search = routes.sessions.selected(2).split('?')[1];
    const { result } = renderSelection();
    expect(result.current.selectedId).toBe(2);
  });

  it.each([selecting(9), selecting('junk'), ''])('selects nothing for unloaded or malformed ids (%s)', (search) => {
    navState.search = search;
    const { result } = renderSelection();
    expect(result.current.selectedId).toBeNull();
  });

  it('selects another session in place of the history entry', () => {
    navState.search = selecting(1);
    const { result } = renderSelection();
    result.current.toggle(2);
    expect(updateParamsMock).toHaveBeenCalledWith({ [KEY]: '2' }, { replace: true });
  });

  it('deselects when toggling the selected session', () => {
    navState.search = selecting(1);
    const { result } = renderSelection();
    result.current.toggle(1);
    expect(updateParamsMock).toHaveBeenCalledWith({ [KEY]: null }, { replace: true });
  });

  it('clears the selection', () => {
    navState.search = selecting(1);
    const { result } = renderSelection();
    result.current.clear();
    expect(updateParamsMock).toHaveBeenCalledWith({ [KEY]: null }, { replace: true });
  });

  it('scrolls to the URL-selected session once, when it first loads', () => {
    navState.search = selecting(2);
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
