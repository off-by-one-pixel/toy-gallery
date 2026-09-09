// @vitest-environment happy-dom

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { settle } from '@/test/wait';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useNavigation', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/useNavigation')>();
  const { testNavigation } = await import('@/test/navigation');
  return { ...original, useNavigation: () => testNavigation() };
});

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void;
const ioCallbacks: IOCallback[] = [];

class IntersectionObserverStub {
  constructor(callback: IOCallback) {
    ioCallbacks.push(callback);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);

const { sessionsState, startActionState } = vi.hoisted(() => ({
  sessionsState: { current: {} as Record<string, unknown> },
  startActionState: { current: null as Record<string, unknown> | null },
}));

vi.mock('@/features/sessions/useSessions', () => ({
  useSessions: () => sessionsState.current,
}));

vi.mock('@/features/sessions/live/useStartLiveAction', () => ({
  useStartLiveAction: (onStarted?: (session: unknown) => void) => {
    startActionState.current = startActionState.current && { ...startActionState.current, onStarted };
    return startActionState.current;
  },
}));

vi.mock('@/features/sessions/list/useToyUsage', () => ({
  useToyUsage: () => new Map([[1, 9]]),
}));

vi.mock('@/features/sessions/media/useMediaStrip', () => ({
  useMediaStatus: () => ({ configured: false }),
}));

const { setSubtitleMock } = vi.hoisted(() => ({ setSubtitleMock: vi.fn() }));

vi.mock('@/components/TopBarProvider', () => ({
  useSetTopBarSubtitle: (subtitle: string | null) => setSubtitleMock(subtitle),
}));

vi.mock('@/components/PageToolbar', () => ({
  default: ({
    start,
    actions,
    children,
  }: {
    start: React.ReactNode;
    actions: readonly { key: string; label: string; onPress: () => void }[];
    children?: React.ReactNode;
  }) => (
    <header>
      {start}
      {actions.map((action) => (
        <button key={action.key} type="button" onClick={() => action.onPress()}>
          {action.label}
        </button>
      ))}
      {children}
    </header>
  ),
}));

vi.mock('@/features/sessions/stats/SessionStats', () => ({
  default: () => null,
}));

import en from '@/i18n/catalogs/en.json';
import { resetNavigation } from '@/test/navigation';
import type { Session, Toy } from '@/api/types';
import { parseSessionFilters, toysById } from '@/features/sessions/session';
import { makeSession, makeToy } from '@/test/fixtures';
import { withAppProviders } from '@/test/render';
import SessionList from '@/features/sessions/list/SessionList';

const session = (id: number, media: { photos: number; videos: number } = { photos: 0, videos: 0 }): Session =>
  makeSession({
    id,
    startedAt: '2026-06-01T20:00:00',
    photoCount: media.photos,
    videoCount: media.videos,
    maxInsertableLength: 120,
    maxCircumference: 110,
  });

const emptyFilters = () => parseSessionFilters(() => null);

const listData = (overrides: Record<string, unknown> = {}) => ({
  sessionCount: 2,
  sessions: [session(1), session(2, { photos: 2, videos: 1 })],
  toysById: new Map<number, Toy>(),
  hasMore: false,
  isLoadingMore: false,
  loadMore: vi.fn(),
  prependSession: vi.fn(),
  reload: vi.fn(),
  filter: 'all',
  setFilter: vi.fn(),
  toys: [] as Toy[],
  sessionFilters: emptyFilters(),
  setSessionFilters: vi.fn(),
  isLoading: false,
  error: null,
  session: null,
  isSessionLoading: false,
  sessionError: null,
  saveSession: vi.fn(),
  isSavingSession: false,
  removeSession: vi.fn(),
  isRemovingSession: false,
  ...overrides,
});

const renderList = (overrides: Record<string, unknown> = {}) => {
  const data = listData(overrides);
  sessionsState.current = data;
  render(withAppProviders(<SessionList />));
  return data;
};

describe('SessionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNavigation();
    localStorage.clear();
    ioCallbacks.length = 0;
    startActionState.current = null;
  });

  it('renders a row per session and a media badge for flagged sessions', () => {
    renderList();
    expect(screen.getAllByRole('button', { name: en.session.detailsToggleLabel })).toHaveLength(2);
    expect(screen.getAllByLabelText('2 photos, 1 videos')).toHaveLength(1);
  });

  it('marks the record-setting toy and the peak value with trophies, skipping unknown keys', () => {
    const steel = makeToy({ id: 1, name: 'Steel' });
    renderList({
      toysById: toysById([steel]),
      toys: [steel],
      sessions: [
        {
          ...session(1),
          entries: [{ toy: 1, involvement: 'FULLY_INSERTED' }],
          records: [
            { key: 'pr-width', toy: 1, value: 240, achievedAt: '2026-06-01T21:00:00' },
            { key: 'pr-future', toy: 1, value: 5, achievedAt: '2026-06-01T21:00:00' },
          ],
        } as unknown as Session,
        session(2),
      ],
    });
    expect(screen.getAllByLabelText(en.session.records.width.circumference)).toHaveLength(3);
    expect(screen.queryByLabelText(/pr-future/)).toBeNull();

    const rows = screen.getAllByRole('button', { name: en.session.detailsToggleLabel }).map((b) => b.parentElement);
    expect(rows[0]?.className).toContain('border-amber-500');
    expect(rows[1]?.className).not.toContain('border-amber-500');
  });

  it('shows a multiplier on the toy trophy when a toy holds several records', () => {
    const steel = makeToy({ id: 1, name: 'Steel' });
    renderList({
      toysById: toysById([steel]),
      toys: [steel],
      sessions: [
        {
          ...session(1),
          entries: [{ toy: 1, involvement: 'FULLY_INSERTED' }],
          records: [
            { key: 'pr-width', toy: 1, value: 240, achievedAt: '2026-06-01T21:00:00' },
            { key: 'toy-level', toy: 1, value: 2, achievedAt: '2026-06-01T21:00:00' },
            { key: 'toy-time', toy: 1, value: 90, achievedAt: '2026-06-01T21:00:00' },
          ],
        } as unknown as Session,
      ],
    });
    const multiplier = screen.getByText('×3');
    expect(screen.queryByLabelText(en.session.records.plugged)).toBeNull();
    const overlayLabel = [
      en.session.records.width.circumference,
      en.session.records.level,
      en.session.records.time,
    ].join(', ');
    expect(multiplier.closest('[aria-label]')?.getAttribute('aria-label')).toBe(overlayLabel);
    expect(multiplier.closest('[data-slot="tooltip-trigger"]')).toBeTruthy();
  });

  it('marks the total time with a trophy when the session holds the plugged record', () => {
    const steel = makeToy({ id: 1, name: 'Steel' });
    renderList({
      toysById: toysById([steel]),
      toys: [steel],
      sessions: [
        {
          ...session(1),
          totalToyDurationMinutes: 45,
          entries: [{ toy: 1, involvement: 'FULLY_INSERTED' }],
          records: [{ key: 'pr-time', toy: null, value: 45, achievedAt: '2026-06-01T21:00:00' }],
        } as unknown as Session,
      ],
    });
    expect(screen.getAllByLabelText(en.session.records.plugged)).toHaveLength(2);
    expect(screen.getAllByText('45m').length).toBeGreaterThanOrEqual(1);
  });

  it('publishes the server count to the top bar, not the loaded page size', () => {
    renderList({ sessions: [session(1)], sessionCount: 41 });
    expect(setSubtitleMock).toHaveBeenCalledWith(`41 ${en.session.recorded}`);
  });

  it('renders the start-live action and prepends the started session', () => {
    const onPress = vi.fn();
    startActionState.current = {
      key: 'start-live',
      label: en.session.live.startButton,
      icon: () => null,
      variant: 'primary',
      onPress,
    };
    const data = renderList();

    const buttons = screen.getAllByRole('button', { name: en.session.live.startButton });
    fireEvent.click(buttons[0]);
    expect(onPress).toHaveBeenCalledTimes(1);

    const onStarted = startActionState.current?.onStarted as (s: Session) => void;
    act(() => onStarted(session(9)));
    expect(data.prependSession).toHaveBeenCalledWith(session(9));
  });

  it('switches the filter window', () => {
    const data = renderList();
    fireEvent.click(screen.getByText(en.session.filter.week));
    expect(data.setFilter).toHaveBeenCalledWith('week');
  });

  it('toggles toy and flag filters through the popover', async () => {
    const steel = makeToy({ id: 1, name: 'Steel' });
    const data = renderList({ toys: [steel], toysById: toysById([steel]) });

    fireEvent.click(screen.getByRole('button', { name: en.session.filters.buttonLabel }));
    fireEvent.click(await screen.findByRole('checkbox', { name: /B Steel/ }));
    expect(data.setSessionFilters).toHaveBeenCalledWith(expect.objectContaining({ toyIds: [1] }));

    fireEvent.click(screen.getByRole('checkbox', { name: en.session.filters.hasMedia }));
    expect(data.setSessionFilters).toHaveBeenCalledWith(expect.objectContaining({ hasMedia: true }));

    fireEvent.click(screen.getByRole('checkbox', { name: en.session.filters.hasPr }));
    expect(data.setSessionFilters).toHaveBeenCalledWith(expect.objectContaining({ hasPr: true }));
  });

  it('shows active filters as dismissible chips', () => {
    const steel = makeToy({ id: 1, name: 'Steel' });
    const data = renderList({
      toys: [steel],
      toysById: toysById([steel]),
      sessionFilters: { ...emptyFilters(), toyIds: [1] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'B Steel ×' }));
    expect(data.setSessionFilters).toHaveBeenCalledWith(expect.objectContaining({ toyIds: [] }));
  });

  it('loads more when the sentinel intersects', () => {
    const data = renderList({ hasMore: true });
    expect(ioCallbacks.length).toBeGreaterThan(0);
    ioCallbacks[ioCallbacks.length - 1]([{ isIntersecting: true }]);
    expect(data.loadMore).toHaveBeenCalledTimes(1);
  });

  it('toggles row selection through the overlay button', () => {
    renderList();
    const toggles = screen.getAllByRole('button', { name: en.session.detailsToggleLabel });
    const row = toggles[0].parentElement as HTMLElement;

    fireEvent.click(toggles[0]);
    expect(row.className).toContain('ring-accent');
    expect(toggles[0].getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(toggles[0]);
    expect(row.className).not.toContain('ring-accent');
    expect(toggles[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('deletes a session through the confirmation modal', async () => {
    const removeSession = vi.fn().mockResolvedValue(undefined);
    renderList({ removeSession });

    fireEvent.click(screen.getAllByRole('button', { name: en.common.delete })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(en.session.deleteConfirm)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: en.common.delete }));
    await settle(() => expect(removeSession).toHaveBeenCalledWith(1));
    await settle(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps the session when the confirmation is cancelled', async () => {
    const removeSession = vi.fn();
    renderList({ removeSession });

    fireEvent.click(screen.getAllByRole('button', { name: en.common.delete })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: en.common.cancel }));

    await settle(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(removeSession).not.toHaveBeenCalled();
  });
});
