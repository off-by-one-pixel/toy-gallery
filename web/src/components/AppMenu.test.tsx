// @vitest-environment jsdom

import type { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/api', () => ({
  fetchMediaIndicators: vi.fn(),
  refreshAllSessionMedia: vi.fn(),
  login: vi.fn(),
}));

globalThis.CSS ??= { escape: (value: string) => value } as unknown as typeof CSS;

import en from '@/i18n/catalogs/en.json';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { fetchMediaIndicators, refreshAllSessionMedia } from '@/api';
import { createTestQueryClient, QueryWrapper } from '@/test/QueryWrapper';
import AppMenu from '@/components/AppMenu';

const wrap = (client?: QueryClient) => (
  <NextIntlClientProvider locale="en" messages={en}>
    <QueryWrapper client={client}>
      <AuthProvider>
        <AppMenu />
      </AuthProvider>
    </QueryWrapper>
  </NextIntlClientProvider>
);

describe('AppMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('omits the refresh-media item when media is not configured', async () => {
    vi.mocked(fetchMediaIndicators).mockResolvedValue({ configured: false, counts: new Map() });
    render(wrap());
    await waitFor(() => expect(fetchMediaIndicators).toHaveBeenCalled());
    fireEvent.click(screen.getByLabelText(en.collection.menu.openMenu));
    await screen.findByText(en.collection.menu.settingsLabel);
    expect(screen.queryByText(en.session.media.refreshButtonLabel)).toBeNull();
  });

  it('refreshes media and invalidates the media queries when configured', async () => {
    vi.mocked(fetchMediaIndicators).mockResolvedValue({
      configured: true,
      counts: new Map([[1, { photos: 1, videos: 0 }]]),
    });
    vi.mocked(refreshAllSessionMedia).mockResolvedValue({
      configured: true,
      counts: new Map([
        [1, { photos: 1, videos: 0 }],
        [2, { photos: 0, videos: 1 }],
      ]),
    });
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    render(wrap(client));
    fireEvent.click(screen.getByLabelText(en.collection.menu.openMenu));
    const item = await screen.findByText(en.session.media.refreshButtonLabel);
    fireEvent.click(item);

    await waitFor(() => expect(refreshAllSessionMedia).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['media'] }));
  });
});
