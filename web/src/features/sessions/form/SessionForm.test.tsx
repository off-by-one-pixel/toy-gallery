// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useNavigation', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/useNavigation')>();
  const { testNavigation } = await import('@/test/navigation');
  return { ...original, useNavigation: () => testNavigation() };
});

const sessionsState = vi.hoisted(() => ({
  current: {
    session: null as unknown,
    isSessionLoading: false,
    sessionError: null as string | null,
    saveSession: vi.fn(),
    isSavingSession: false,
  },
}));

vi.mock('@/features/sessions/useSessions', () => ({
  useSessions: () => sessionsState.current,
}));

vi.mock('@/features/toys/useToys', () => ({
  useToys: () => ({ toys: [], isLoading: false, error: null }),
}));

import en from '@/i18n/catalogs/en.json';
import { navigateMock, resetNavigation } from '@/test/navigation';
import { makeSession } from '@/test/fixtures';
import { withAppProviders } from '@/test/render';
import SessionForm from '@/features/sessions/form/SessionForm';

globalThis.CSS ??= { escape: (value: string) => value } as unknown as typeof CSS;

const liveSession = (startedAt: string) => makeSession({ id: 5, startedAt, isLive: true });

describe('SessionForm live sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNavigation();
    localStorage.clear();
    sessionsState.current.session = null;
    sessionsState.current.isSavingSession = false;
  });

  it('saves a start-time-only change for a live session without toys', async () => {
    sessionsState.current.session = liveSession('2026-08-22T08:00:00Z');
    sessionsState.current.saveSession.mockResolvedValue(liveSession('2026-08-22T07:00:00Z'));
    render(withAppProviders(<SessionForm mode={{ kind: 'edit', sessionId: 5 }} />));

    const save = await screen.findByRole('button', { name: en.session.live.updateButton });
    expect(screen.getByText(en.session.live.badge)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.session.live.endAndSaveButton })).toBeNull();
    expect(save.hasAttribute('disabled')).toBe(true);

    const startInput = document.querySelector('input[type="datetime-local"]');
    expect(startInput).not.toBeNull();
    fireEvent.change(startInput as Element, { target: { value: '2026-08-22T07:00' } });
    await waitFor(() => expect(save.hasAttribute('disabled')).toBe(false));
    fireEvent.click(save);

    await waitFor(() => expect(sessionsState.current.saveSession).toHaveBeenCalledTimes(1));
    expect(sessionsState.current.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 5,
        liveStartOnly: true,
        payload: expect.objectContaining({ entries: [] }),
      }),
    );
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/sessions'));
  });

  it('keeps save disabled for a finished session without toys', async () => {
    sessionsState.current.session = { ...liveSession('2026-08-22T08:00:00Z'), isLive: false };
    render(withAppProviders(<SessionForm mode={{ kind: 'edit', sessionId: 5 }} />));

    const save = await screen.findByRole('button', { name: en.session.save });
    expect(save.hasAttribute('disabled')).toBe(true);
    fireEvent.click(save);
    expect(sessionsState.current.saveSession).not.toHaveBeenCalled();
  });
});
