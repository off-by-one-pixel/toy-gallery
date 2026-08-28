// @vitest-environment jsdom

import type { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  fetchMediaStatus: vi.fn(),
  refreshAllSessionMedia: vi.fn(),
  rebuildRecords: vi.fn(),
}));

import en from '@/i18n/catalogs/en.json';
import { fetchMediaStatus, rebuildRecords, refreshAllSessionMedia } from '@/api';
import { tokenStorage } from '@/api/http';
import { useAppMenuItems } from '@/components/appMenuActions';
import { createTestQueryClient } from '@/test/QueryWrapper';
import { withAppProviders } from '@/test/render';

const makeWrapper = (client: QueryClient) =>
  function Wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
    return withAppProviders(children, { client });
  };

const renderItems = (client: QueryClient = createTestQueryClient()) =>
  renderHook(() => useAppMenuItems(), { wrapper: makeWrapper(client) });

const settle = async () => {
  await waitFor(() => expect(fetchMediaStatus).toHaveBeenCalled());
  await act(async () => undefined);
};

const item = (items: ReturnType<typeof useAppMenuItems>, id: string) => {
  const found = items.find((entry) => entry.id === id);
  if (!found) throw new Error(`no item ${id}`);
  return found;
};

describe('useAppMenuItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(fetchMediaStatus).mockResolvedValue({ configured: true });
  });

  it('lists the registry items in order with resolved labels', async () => {
    const { result } = renderItems();
    await waitFor(() =>
      expect(result.current.map((entry) => entry.id)).toEqual([
        'settings',
        'refresh-media',
        'rebuild-records',
        'logout',
      ]),
    );
    expect(result.current.map((entry) => entry.label)).toEqual([
      en.collection.menu.settingsLabel,
      en.session.media.refreshButtonLabel,
      en.settings.data.rebuildLabel,
      en.collection.menu.signOutLabel,
    ]);
  });

  it('omits refresh-media when media is not configured', async () => {
    vi.mocked(fetchMediaStatus).mockResolvedValue({ configured: false });
    const { result } = renderItems();
    await settle();
    expect(result.current.map((entry) => entry.id)).toEqual(['settings', 'rebuild-records', 'logout']);
  });

  it('describes logout by the signed-in username', async () => {
    tokenStorage.setTokens({ access: 'a', refresh: 'r' }, 'kai');
    const { result } = renderItems();
    await settle();
    expect(item(result.current, 'logout').description).toBe(
      en.collection.menu.signOutDescriptionSignedIn.replace('{username}', 'kai'),
    );
  });

  it('navigates to the settings page', async () => {
    const { result } = renderItems();
    await settle();
    item(result.current, 'settings').onAction();
    expect(push).toHaveBeenCalledWith('/settings');
  });

  it('refreshes media and invalidates media and session lists', async () => {
    vi.mocked(refreshAllSessionMedia).mockResolvedValue({ configured: true, sessionsWithMedia: 2 });
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderItems(client);
    await waitFor(() => expect(result.current.some((entry) => entry.id === 'refresh-media')).toBe(true));

    act(() => item(result.current, 'refresh-media').onAction());

    await waitFor(() => expect(refreshAllSessionMedia).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['media'] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sessions', 'list'] });
  });

  it('rebuilds records and invalidates session data', async () => {
    vi.mocked(rebuildRecords).mockResolvedValue(4);
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderItems(client);
    await settle();

    act(() => item(result.current, 'rebuild-records').onAction());

    await waitFor(() => expect(rebuildRecords).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sessions', 'list'] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sessions', 'stats'] });
  });

  it('signs the user out, clearing stored credentials', async () => {
    tokenStorage.setTokens({ access: 'a', refresh: 'r' }, 'kai');
    const { result } = renderItems();
    await settle();
    act(() => item(result.current, 'logout').onAction());
    expect(tokenStorage.getAccess()).toBeNull();
  });
});
