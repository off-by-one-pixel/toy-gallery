import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  fetchAppTokenStatus: vi.fn(),
  createAppToken: vi.fn(),
  revokeAppToken: vi.fn(),
}));

import { createAppToken, fetchAppTokenStatus, revokeAppToken } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { API_CONFIG } from '@/config';
import en from '@/i18n/catalogs/en.json';
import ApiAccessSection from '@/features/settings/ApiAccessSection';
import { hoverWithMouse } from '@/test/pointer';
import { createTestQueryClient } from '@/test/QueryWrapper';
import { withAppProviders } from '@/test/render';

const strings = en.settings.apiAccess;
const CREATED = '2026-10-24T12:00:00Z';

const renderSection = () => {
  const client = createTestQueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(withAppProviders(<ApiAccessSection />, { client }));
  return { invalidate };
};

const enabledButton = async (name: string) => {
  const button = await screen.findByRole<HTMLButtonElement>('button', { name });
  await waitFor(() => expect(button.disabled).toBe(false));
  return button;
};

describe('ApiAccessSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates a token and reveals its key', async () => {
    vi.mocked(fetchAppTokenStatus).mockResolvedValue({ created: null });
    vi.mocked(createAppToken).mockResolvedValue({ key: 'fresh-key', created: CREATED });
    const { invalidate } = renderSection();
    fireEvent.click(await enabledButton(strings.generateButton));
    expect(await screen.findByText('fresh-key')).toBeTruthy();
    expect(createAppToken).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.appToken.status });
  });

  it('explains why generating is blocked when the status fails to load', async () => {
    vi.mocked(fetchAppTokenStatus).mockRejectedValue(new Error('boom'));
    renderSection();
    expect(await screen.findByText(strings.tokenUnknown)).toBeTruthy();
    const generate = screen
      .getAllByRole('button', { name: strings.generateButton })
      .find((el): el is HTMLButtonElement => el instanceof HTMLButtonElement)!;
    expect(generate.disabled).toBe(true);
    hoverWithMouse(generate.closest('[data-slot="tooltip-trigger"]')!);
    expect(await screen.findByText(/^Couldn't check for an existing token: /)).toBeTruthy();
  });

  it('shows when the existing token was created', async () => {
    vi.mocked(fetchAppTokenStatus).mockResolvedValue({ created: CREATED });
    renderSection();
    expect(await screen.findByText('Read-only, plus session start and stop. Created Oct 24, 2026.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: strings.generateButton })).toBeNull();
  });

  it('regenerates only after confirmation', async () => {
    vi.mocked(fetchAppTokenStatus).mockResolvedValue({ created: CREATED });
    vi.mocked(createAppToken).mockResolvedValue({ key: 'rotated-key', created: CREATED });
    renderSection();
    fireEvent.click(await enabledButton(strings.regenerateButton));
    expect(createAppToken).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: strings.regenerateConfirm.action }));
    expect(await screen.findByText('rotated-key')).toBeTruthy();
  });

  it('revokes only after confirmation', async () => {
    vi.mocked(fetchAppTokenStatus).mockResolvedValue({ created: CREATED });
    vi.mocked(revokeAppToken).mockResolvedValue();
    const { invalidate } = renderSection();
    fireEvent.click(await enabledButton(strings.revokeButton));
    expect(revokeAppToken).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: strings.revokeConfirm.action }));
    await waitFor(() => expect(revokeAppToken).toHaveBeenCalledTimes(1));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.appToken.status });
  });

  it('links to the API documentation', async () => {
    vi.mocked(fetchAppTokenStatus).mockResolvedValue({ created: null });
    renderSection();
    const link = await screen.findByRole('link', { name: strings.docsButton });
    expect(link.getAttribute('href')).toBe(`${API_CONFIG.baseUrl}/api/docs/`);
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
