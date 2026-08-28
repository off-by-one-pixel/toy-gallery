'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Spinner } from '@heroui/react';
import { ArrowLeft, Check, Clock, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { createSession, fetchToys, fetchSession, patchSessionStart, updateSession } from '@/api';
import { queryKeys, sessionDataKeys } from '@/api/queryKeys';
import { Involvement } from '@/api/types';

type ToySelection = { involvement: Involvement; durationMinutes: number | null };
import { SortProvider } from '@/providers/SortProvider';
import { useSortOf } from '@/hooks/useSortOf';
import { datetimeLocalValue } from '@/lib/dates';
import { minutesBetween } from '@/lib/duration';
import { filterToys } from '@/features/toys/search';
import { SESSION_FORM_TOY_SORT, sortToys } from '@/features/toys/toySort';
import { useApiMutation, useApiQuery } from '@/hooks/useApi';
import SearchInput from '@/components/SearchInput';
import LiveBadge from '@/features/sessions/live/LiveBadge';
import SectionHeading from '@/components/SectionHeading';
import ToySortControl from '@/features/toys/gallery/ToySortControl';
import ToyChipSelector from '@/features/sessions/form/ToyChipSelector';

export type SessionFormMode = { kind: 'new' } | { kind: 'edit'; sessionId: number };

type SavePayload = Parameters<typeof createSession>[0];

const persistSession = (sessionId: number | null, liveStartOnly: boolean, payload: SavePayload) => {
  if (sessionId === null) return createSession(payload);
  if (liveStartOnly) return patchSessionStart(sessionId, payload.startedAt);
  return updateSession(sessionId, payload);
};

const saveLabelFor = (isLive: boolean, liveUpdateMode: boolean, t: (key: string) => string): string => {
  if (!isLive) return t('save');
  return liveUpdateMode ? t('live.updateButton') : t('live.endAndSaveButton');
};

const datetimeLocalNow = () => datetimeLocalValue(new Date());

export default function SessionForm({ mode }: Readonly<{ mode: SessionFormMode }>) {
  return (
    <SortProvider config={SESSION_FORM_TOY_SORT}>
      <SessionFormContent mode={mode} />
    </SortProvider>
  );
}

function SessionFormContent({ mode }: Readonly<{ mode: SessionFormMode }>) {
  const router = useRouter();
  const t = useTranslations('session');
  const common = useTranslations('common');
  const [startedAt, setStartedAt] = useState(datetimeLocalNow);
  const [endedAt, setEndedAt] = useState('');
  const [query, setQuery] = useState('');
  const [selections, setSelections] = useState<Map<number, ToySelection>>(() => new Map());

  const sessionId = mode.kind === 'edit' ? mode.sessionId : null;

  const {
    data: toysData,
    isPending: toysPending,
    errorMessage: toysError,
  } = useApiQuery({ key: queryKeys.toys.all, fn: fetchToys });
  const toys = useMemo(() => toysData ?? [], [toysData]);

  const detail = useApiQuery({
    key: queryKeys.sessions.detail(sessionId ?? 0),
    fn: () => fetchSession(sessionId ?? 0),
    enabled: sessionId !== null,
  });

  const loadedSession = detail.data;
  const hasSeededDraft = useRef(false);
  useEffect(() => {
    if (!loadedSession || hasSeededDraft.current) return;
    hasSeededDraft.current = true;
    setStartedAt(datetimeLocalValue(new Date(loadedSession.startedAt)));
    setEndedAt(loadedSession.endedAt ? datetimeLocalValue(new Date(loadedSession.endedAt)) : '');
    setSelections(
      new Map(
        loadedSession.entries.map((e) => [
          e.toy,
          { involvement: e.involvement, durationMinutes: e.durationMinutes ?? null },
        ]),
      ),
    );
  }, [loadedSession]);

  const isLoading = toysPending || (sessionId !== null && detail.isPending);
  const errorMessage = toysError ?? detail.errorMessage;

  const { sort } = useSortOf(SESSION_FORM_TOY_SORT);
  const filteredToys = useMemo(() => sortToys(filterToys(toys, query), sort), [toys, query, sort]);
  const selectedCount = selections.size;
  const sessionSpan = startedAt && endedAt ? minutesBetween(startedAt, endedAt) : null;
  const wholeSessionMinutes = sessionSpan !== null && sessionSpan > 0 ? sessionSpan : null;

  const handlePick = (toyId: number, next: Involvement | null) => {
    setSelections((prev) => {
      const updated = new Map(prev);
      if (next === null) {
        updated.delete(toyId);
      } else {
        updated.set(toyId, {
          involvement: next,
          durationMinutes: prev.get(toyId)?.durationMinutes ?? null,
        });
      }
      return updated;
    });
  };

  const changeDuration = (toyId: number, next: number | null) => {
    setSelections((prev) => {
      const current = prev.get(toyId);
      if (!current) return prev;
      const updated = new Map(prev);
      updated.set(toyId, { ...current, durationMinutes: next });
      return updated;
    });
  };

  const isLive = loadedSession?.isLive === true;
  const liveUpdateMode = isLive && endedAt === '';
  const liveStartOnly = liveUpdateMode && selectedCount === 0;
  const startDirty = loadedSession == null || startedAt !== datetimeLocalValue(new Date(loadedSession.startedAt));
  const canSave = selectedCount > 0 || (liveStartOnly && startDirty);

  const saveSession = () =>
    persistSession(sessionId, liveStartOnly, {
      startedAt: new Date(startedAt).toISOString(),
      endedAt: endedAt ? new Date(endedAt).toISOString() : null,
      entries: [...selections.entries()].map(([toy, sel]) => ({
        toy,
        involvement: sel.involvement,
        durationMinutes: sel.durationMinutes,
      })),
    });

  const save = useApiMutation({
    fn: saveSession,
    success: () => t('savedToast'),
    invalidates: () => [...(sessionId !== null ? [queryKeys.sessions.detail(sessionId)] : []), ...sessionDataKeys],
    onSuccess: () => router.push('/sessions'),
  });

  const handleSave = () => {
    if (!canSave) return;
    void save.run();
  };

  const title = mode.kind === 'edit' ? t('editTitle') : t('newTitle');
  const saveLabel = saveLabelFor(isLive, liveUpdateMode, t as unknown as (key: string) => string);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-surface-secondary/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 items-center gap-3 px-6 py-3.5">
          <button
            type="button"
            onClick={() => router.push('/sessions')}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted transition-colors hover:bg-surface-tertiary/60 hover:text-foreground"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            {t('backToList')}
          </button>
          <h1 className="m-0 text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          {loadedSession?.isLive === true && <LiveBadge />}
        </div>
      </header>

      <main className="mx-auto max-w-300 px-6 py-6 pb-24">
        {errorMessage && (
          <Alert status="danger" className="mb-4">
            <Alert.Description>{errorMessage}</Alert.Description>
          </Alert>
        )}

        <section className="mb-7">
          <div className="mb-3 flex items-center gap-3">
            <SectionHeading title={t('whenHeading')} />
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <div className="mb-1 text-caption font-medium uppercase tracking-wider text-text-tertiary">
                {t('startedLabel')}
                <span className="ml-0.5 align-middle text-sm leading-none text-accent">*</span>
              </div>
              <div className="flex w-full max-w-90 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-sm">
                <Clock size={16} className="shrink-0 text-muted" />
                <input
                  type="datetime-local"
                  value={startedAt}
                  onChange={(e) => setStartedAt(e.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm tabular-nums text-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={() => setStartedAt(datetimeLocalNow())}
                  className="shrink-0 rounded-md border border-border bg-surface-secondary px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface"
                >
                  {t('nowButton')}
                </button>
              </div>
            </div>
            <div>
              <div className="mb-1 text-caption font-medium uppercase tracking-wider text-text-tertiary">
                {t('endedLabel')}
              </div>
              <div className="flex w-full max-w-90 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-sm">
                <Clock size={16} className="shrink-0 text-muted" />
                <input
                  type="datetime-local"
                  value={endedAt}
                  onChange={(e) => setEndedAt(e.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm tabular-nums text-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={() => setEndedAt(datetimeLocalNow())}
                  className="shrink-0 rounded-md border border-border bg-surface-secondary px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface"
                >
                  {t('nowButton')}
                </button>
                {endedAt && (
                  <button
                    type="button"
                    aria-label={t('clearEndedLabel')}
                    onClick={() => setEndedAt('')}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-3">
            <SectionHeading title={t('toysHeading')} />
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <SearchInput value={query} onChange={setQuery} />
            <ToySortControl />
            <span className="text-sm text-muted">{t('toysHint')}</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20 text-muted">
              <Spinner />
            </div>
          ) : (
            <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {filteredToys.map((toy) => (
                <ToyChipSelector
                  key={toy.id}
                  toy={toy}
                  state={selections.get(toy.id)?.involvement ?? null}
                  duration={selections.get(toy.id)?.durationMinutes ?? null}
                  onChange={(next) => handlePick(toy.id, next)}
                  wholeSessionMinutes={wholeSessionMinutes}
                  onAddDuration={(minutes) =>
                    changeDuration(toy.id, (selections.get(toy.id)?.durationMinutes ?? 0) + minutes)
                  }
                  onSetDuration={(minutes) => changeDuration(toy.id, minutes)}
                  onClearDuration={() => changeDuration(toy.id, null)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 shadow-[0_-4px_16px_rgba(17,24,39,.06)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 items-center gap-3 px-6 py-3.5">
          <div className="text-sm text-foreground">
            <span className="font-semibold text-accent">{selectedCount}</span>{' '}
            {t('toysSelected', { count: selectedCount })}
          </div>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onPress={() => router.push('/sessions')}>
            {common('cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isDisabled={!canSave || save.isPending}
            className={liveUpdateMode ? 'bg-emerald-600 text-white hover:bg-emerald-500' : ''}
            onPress={handleSave}
          >
            <Check size={14} strokeWidth={2.2} />
            {saveLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
