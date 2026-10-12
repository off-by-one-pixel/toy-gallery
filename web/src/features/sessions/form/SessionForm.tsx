'use client';

import { useId, useMemo, useState } from 'react';
import { Alert, Button, Spinner } from '@heroui/react';
import { ArrowLeft, Check, Clock, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Session } from '@/api/types';
import { SortProvider } from '@/providers/SortProvider';
import { useSortOf } from '@/hooks/useSortOf';
import { datetimeLocalValue } from '@/lib/dates';
import { minutesBetween } from '@/lib/duration';
import { useNow } from '@/hooks/useNow';
import { filterToys } from '@/features/toys/search';
import { SESSION_FORM_TOY_SORT, sortToys } from '@/features/toys/toySort';
import { useSaveSession, useSession } from '@/features/sessions/useSessions';
import { useToys } from '@/features/toys/useToys';
import SearchInput from '@/components/SearchInput';
import TextInput from '@/components/TextInput';
import LiveBadge from '@/features/sessions/live/LiveBadge';
import SectionHeading from '@/components/SectionHeading';
import ToySortControl from '@/features/toys/gallery/ToySortControl';
import ToyChipSelector from '@/features/sessions/form/ToyChipSelector';
import {
  isLiveOpen,
  selectionsFromSession,
  sessionPayload,
  sessionSaveKind,
  withDuration,
  withInvolvement,
} from '@/features/sessions/form/sessionDraft';
import type { Translator } from '@/i18n/translator';

type SessionFormMode = { kind: 'new' } | { kind: 'edit'; sessionId: number };

const saveLabelFor = (isLive: boolean, liveUpdateMode: boolean, t: Translator<'session'>): string => {
  if (!isLive) return t('save');
  return liveUpdateMode ? t('live.updateButton') : t('live.endAndSaveButton');
};

const datetimeLocalNow = () => datetimeLocalValue(new Date());

type Props = Readonly<{ mode: SessionFormMode; onDone: () => void; onSaved: (session: Session) => void }>;

type SessionDetail = ReturnType<typeof useSession>;

export default function SessionForm(props: Props) {
  return (
    <SortProvider config={SESSION_FORM_TOY_SORT}>
      <SessionFormLoader {...props} />
    </SortProvider>
  );
}

function SessionFormLoader(props: Props) {
  const detail = useSession(props.mode.kind === 'edit' ? props.mode.sessionId : null);
  return <SessionFormContent key={detail.session?.id ?? 'new'} {...props} detail={detail} />;
}

function SessionFormContent({ mode, onDone, onSaved, detail }: Props & Readonly<{ detail: SessionDetail }>) {
  const t = useTranslations('session');
  const common = useTranslations('common');
  const loadedSession = detail.session;
  const [startedAt, setStartedAt] = useState(() =>
    loadedSession ? datetimeLocalValue(new Date(loadedSession.startedAt)) : datetimeLocalNow(),
  );
  const [endedAt, setEndedAt] = useState(() =>
    loadedSession?.endedAt ? datetimeLocalValue(new Date(loadedSession.endedAt)) : '',
  );
  const [query, setQuery] = useState('');
  const [selections, setSelections] = useState(() => selectionsFromSession(loadedSession));
  const [initialToyIds] = useState<ReadonlySet<number>>(() => new Set(loadedSession?.entries.map((e) => e.toy)));

  const sessionId = mode.kind === 'edit' ? mode.sessionId : null;

  const { toys, isLoading: toysPending, error: toysError } = useToys();

  const isLoading = toysPending || detail.isSessionLoading;
  const errorMessage = toysError ?? detail.sessionError;

  const { sort } = useSortOf(SESSION_FORM_TOY_SORT);
  const filteredToys = useMemo(() => {
    const sorted = sortToys(filterToys(toys, query), sort);
    if (initialToyIds.size === 0) return sorted;
    return [
      ...sorted.filter((toy) => initialToyIds.has(toy.id)),
      ...sorted.filter((toy) => !initialToyIds.has(toy.id)),
    ];
  }, [toys, query, sort, initialToyIds]);
  const selectedCount = selections.size;
  const liveOpen = isLiveOpen(loadedSession, endedAt);
  const now = useNow(60_000, liveOpen);
  const spanEnd = liveOpen ? datetimeLocalValue(now) : endedAt;
  const sessionSpan = startedAt && spanEnd ? minutesBetween(startedAt, spanEnd) : null;
  const wholeSessionMinutes = sessionSpan !== null && sessionSpan > 0 ? sessionSpan : null;

  const isLive = loadedSession?.isLive === true;
  const draft = { startedAt, endedAt, selections };
  const saveKind = sessionSaveKind(loadedSession, draft);

  const { saveSession, isSavingSession } = useSaveSession();

  const handleSave = async () => {
    if (!saveKind) return;
    const saved = await saveSession({
      sessionId,
      liveStartOnly: saveKind === 'startOnly',
      payload: sessionPayload(draft),
    });
    if (saved) onSaved(saved);
  };

  const title = mode.kind === 'edit' ? t('editTitle') : t('newTitle');
  const saveLabel = saveLabelFor(isLive, liveOpen, t);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-surface-secondary/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 items-center gap-3 px-6 py-3.5">
          <button
            type="button"
            onClick={onDone}
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
            <DateTimeField label={t('startedLabel')} required value={startedAt} onChange={setStartedAt} />
            <DateTimeField
              label={t('endedLabel')}
              value={endedAt}
              onChange={setEndedAt}
              clearLabel={t('clearEndedLabel')}
            />
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
                  onChange={(next) => setSelections((prev) => withInvolvement(prev, toy.id, next))}
                  wholeSessionMinutes={wholeSessionMinutes}
                  wholeSessionIsLive={liveOpen}
                  onDurationChange={(minutes) => setSelections((prev) => withDuration(prev, toy.id, minutes))}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(17,24,39,.06)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 items-center gap-3 px-6 py-3.5">
          <div className="text-sm text-foreground">
            <span className="font-semibold text-accent">{selectedCount}</span>{' '}
            {t('toysSelected', { count: selectedCount })}
          </div>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onPress={onDone}>
            {common('cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isDisabled={!saveKind || isSavingSession}
            className={liveOpen ? 'bg-live-strong text-white hover:bg-live' : ''}
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

function DateTimeField({
  label,
  required,
  value,
  onChange,
  clearLabel,
}: Readonly<{
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  clearLabel?: string;
}>) {
  const t = useTranslations('session');
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-caption font-medium uppercase tracking-wider text-text-tertiary">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 align-middle text-sm leading-none text-accent">
            *
          </span>
        )}
      </label>
      <TextInput
        id={id}
        type="datetime-local"
        size="sm"
        value={value}
        onChange={onChange}
        className="max-w-90 tabular-nums shadow-sm"
        leading={<Clock size={16} className="shrink-0 text-muted" />}
        trailing={
          <>
            <button
              type="button"
              onClick={() => onChange(datetimeLocalNow())}
              className="shrink-0 rounded-md border border-border bg-surface-secondary px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface"
            >
              {t('nowButton')}
            </button>
            {clearLabel && value && (
              <button
                type="button"
                aria-label={clearLabel}
                onClick={() => onChange('')}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            )}
          </>
        }
      />
    </div>
  );
}
