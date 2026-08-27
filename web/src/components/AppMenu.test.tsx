// @vitest-environment jsdom

import type { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  fetchMediaStatus: vi.fn(),
  refreshAllSessionMedia: vi.fn(),
  rebuildRecords: vi.fn(),
}));

globalThis.CSS ??= { escape: (value: string) => value } as unknown as typeof CSS;

import en from '@/i18n/catalogs/en.json';
import { fetchMediaStatus, rebuildRecords, refreshAllSessionMedia } from '@/api';
import { createTestQueryClient } from '@/test/QueryWrapper';
import { withAppProviders } from '@/test/render';
import AppMenu from '@/components/AppMenu';

const wrap = (client?: QueryClient) => withAppProviders(<AppMenu />, { client });

const openMenu = () => fireEvent.click(screen.getByLabelText(en.collection.menu.openMenu));

describe('AppMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(fetchMediaStatus).mockResolvedValue({ configured: true });
  });

  it('omits the refresh-media item when media is not configured', async () => {
    vi.mocked(fetchMediaStatus).mockResolvedValue({ configured: false });
    render(wrap());
    await waitFor(() => expect(fetchMediaStatus).toHaveBeenCalled());
    openMenu();
    await screen.findByText(en.collection.menu.settingsLabel);
    expect(screen.queryByText(en.session.media.refreshButtonLabel)).toBeNull();
  });

  it('refreshes media and invalidates the media queries when configured', async () => {
    vi.mocked(refreshAllSessionMedia).mockResolvedValue({ configured: true, sessionsWithMedia: 2 });
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    render(wrap(client));
    openMenu();
    fireEvent.click(await screen.findByText(en.session.media.refreshButtonLabel));

    await waitFor(() => expect(refreshAllSessionMedia).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['media'] }));
  });

  it('rebuilds personal records from the menu and refreshes session data', async () => {
    vi.mocked(rebuildRecords).mockResolvedValue(4);
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    render(wrap(client));
    openMenu();
    fireEvent.click(await screen.findByText(en.settings.data.rebuildLabel));

    await waitFor(() => expect(rebuildRecords).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sessions', 'list'] }));
  });
});
