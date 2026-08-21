'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Spinner, Toast } from '@heroui/react';
import { ArrowLeft, Check, Clock, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { createSession, fetchToys, fetchSession, updateSession } from '../services/api';
import { formatError } from '../services/errors';
import { queryKeys } from '../services/queryKeys';
import { Involvement } from '../services/types';

type ToySelection = { involvement: Involvement; durationMinutes: number | null };
import { SortProvider } from '../providers/SortProvider';
import { useSortOf } from '../hooks/useSortOf';
import { datetimeLocalValue } from '../services/dates';
import { minutesBetween } from '../services/duration';
import { filterToys } from '../services/search';
import { SESSION_FORM_TOY_SORT, sortToys } from '../services/toySort';
import { useAsyncAction } from '../hooks/useAsyncAction';
import SearchInput from './SearchInput';
import SectionHeading from './SectionHeading';
import SessionMediaStrip from './session-list/SessionMediaStrip';
import ToySortControl from './ToySortControl';
import ToyChipSelector from './ToyChipSelector';

export type SessionFormMode = { kind: 'new' } | { kind: 'edit'; sessionId: number };

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
  const [saving, setSaving] = useState(false);
  const [startedAt, setStartedAt] = useState(datetimeLocalNow);
  const [endedAt, setEndedAt] = useState('');
  const [query, setQuery] = useState('');
  const [selections, setSelections] = useState<Map<number, ToySelection>>(() => new Map());

  const queryClient = useQueryClient();
  const runToast = useAsyncAction();

  const sessionId = mode.kind === 'edit' ? mode.sessionId : null;

  const {
    data: toysData,
    isPending: toysPending,
    error: toysError,
  } = useQuery({ queryKey: queryKeys.toys.all, queryFn: fetchToys });
  const toys = useMemo(() => toysData ?? [], [toysData]);

  const detail = useQuery({
    queryKey: queryKeys.sessions.detail(sessionId ?? 0),
    queryFn: () => fetchSession(sessionId ?? 0),
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
  const loadError = toysError ?? detail.error;
  const errorMessage = loadError ? formatError(loadError) : null;

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

  const handleSave = () => {
    if (selectedCount === 0) return;
    const payload = {
      startedAt: new Date(startedAt).toISOString(),
      endedAt: endedAt ? new Date(endedAt).toISOString() : null,
      entries: [...selections.entries()].map(([toy, sel]) => ({
        toy,
        involvement: sel.involvement,
        durationMinutes: sel.durationMinutes,
      })),
    };
    const save = sessionId !== null ? updateSession(sessionId, payload) : createSession(payload);
    runToast(() => save, {
      busy: setSaving,
      onSuccess: () => {
        Toast.toast.success(t('savedToast'));
        void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
        router.push('/sessions');
      },
    });
  };

  const title = mode.kind === 'edit' ? t('editTitle') : t('newTitle');

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

        {sessionId !== null && (
          <section className="mb-7">
            <div className="mb-3 flex items-center gap-3">
              <SectionHeading title={t('media.heading')} />
              <div className="h-px flex-1 bg-border" />
            </div>
            <SessionMediaStrip sessionId={sessionId} showHeading={false} />
          </section>
        )}

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
          <Button variant="primary" size="sm" isDisabled={selectedCount === 0 || saving} onPress={handleSave}>
            <Check size={14} strokeWidth={2.2} />
            {t('save')}
          </Button>
        </div>
      </div>
    </>
  );
}
