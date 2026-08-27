// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  fetchToys: vi.fn(),
  fetchSession: vi.fn(),
  createSession: vi.fn(),
  updateSession: vi.fn(),
  patchSessionStart: vi.fn(),
}));

import en from '@/i18n/catalogs/en.json';
import { fetchSession, fetchToys, patchSessionStart, updateSession } from '@/api';
import { makeSession } from '@/test/fixtures';
import { withAppProviders } from '@/test/render';
import SessionForm from '@/features/sessions/form/SessionForm';

globalThis.CSS ??= { escape: (value: string) => value } as unknown as typeof CSS;

const liveSession = (startedAt: string) => makeSession({ id: 5, startedAt, isLive: true });

describe('SessionForm live sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(fetchToys).mockResolvedValue([]);
  });

  it('saves a start-time-only change for a live session without toys', async () => {
    vi.mocked(fetchSession).mockResolvedValue(liveSession('2026-08-22T08:00:00Z'));
    vi.mocked(patchSessionStart).mockResolvedValue(liveSession('2026-08-22T07:00:00Z'));
    render(withAppProviders(<SessionForm mode={{ kind: 'edit', sessionId: 5 }} />));

    const save = await screen.findByRole('button', { name: en.session.live.updateButton });
    expect(screen.getByText(en.session.live.badge)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.session.live.endAndSaveButton })).toBeNull();
    await waitFor(() => expect(fetchSession).toHaveBeenCalledWith(5));
    expect(save.hasAttribute('disabled')).toBe(true);

    const startInput = document.querySelector('input[type="datetime-local"]');
    expect(startInput).not.toBeNull();
    fireEvent.change(startInput as Element, { target: { value: '2026-08-22T07:00' } });
    await waitFor(() => expect(save.hasAttribute('disabled')).toBe(false));
    fireEvent.click(save);

    await waitFor(() => expect(patchSessionStart).toHaveBeenCalledTimes(1));
    expect(vi.mocked(patchSessionStart).mock.calls[0][0]).toBe(5);
    expect(updateSession).not.toHaveBeenCalled();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/sessions'));
  });

  it('keeps save disabled for a finished session without toys', async () => {
    vi.mocked(fetchSession).mockResolvedValue({ ...liveSession('2026-08-22T08:00:00Z'), isLive: false });
    render(withAppProviders(<SessionForm mode={{ kind: 'edit', sessionId: 5 }} />));

    const save = await screen.findByRole('button', { name: en.session.save });
    await waitFor(() => expect(fetchSession).toHaveBeenCalledWith(5));
    expect(save.hasAttribute('disabled')).toBe(true);
    fireEvent.click(save);
    expect(patchSessionStart).not.toHaveBeenCalled();
    expect(updateSession).not.toHaveBeenCalled();
  });
});
