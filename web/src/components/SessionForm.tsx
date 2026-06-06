'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Spinner, Toast } from '@heroui/react';
import { ArrowLeft, Check, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { createSession, fetchCones, fetchSession, updateSession } from '../services/api';
import { Involvement, type Session, type Toy } from '../services/types';
import { filterToys } from '../services/search';
import { useAsyncAction } from '../hooks/useAsyncAction';
import SearchInput from './SearchInput';
import ToyChipSelector from './ToyChipSelector';

export type SessionFormMode = { kind: 'new' } | { kind: 'edit'; sessionId: number };

const datetimeLocalNow = () => formatLocal(new Date());

const formatLocal = (d: Date): string => {
  // datetime-local needs YYYY-MM-DDTHH:mm in *local* time, not UTC.
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function SessionForm({ mode }: Readonly<{ mode: SessionFormMode }>) {
  const router = useRouter();
  const t = useTranslations('session');
  const common = useTranslations('common');
  const [toys, setToys] = useState<Toy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [startedAt, setStartedAt] = useState(datetimeLocalNow);
  const [query, setQuery] = useState('');
  const [selections, setSelections] = useState<Map<number, Involvement>>(() => new Map());

  const runInline = useAsyncAction(setError);
  const runToast = useAsyncAction();

  const sessionId = mode.kind === 'edit' ? mode.sessionId : null;

  useEffect(() => {
    runInline(
      async () => {
        const toysPromise = fetchCones();
        const sessionPromise: Promise<Session | null> =
          sessionId !== null ? fetchSession(sessionId) : Promise.resolve(null);
        const [loadedToys, loadedSession] = await Promise.all([toysPromise, sessionPromise]);
        return { loadedToys, loadedSession };
      },
      {
        busy: setIsLoading,
        onSuccess: ({ loadedToys, loadedSession }) => {
          setToys(loadedToys);
          if (loadedSession) {
            setStartedAt(formatLocal(new Date(loadedSession.startedAt)));
            setSelections(new Map(loadedSession.entries.map((e) => [e.toy, e.involvement])));
          }
          setError(null);
        },
      },
    );
  }, [runInline, sessionId]);

  const filteredToys = useMemo(() => filterToys(toys, query), [toys, query]);
  const selectedCount = selections.size;

  const handlePick = (toyId: number, next: Involvement | null) => {
    setSelections((prev) => {
      const updated = new Map(prev);
      if (next === null) updated.delete(toyId);
      else updated.set(toyId, next);
      return updated;
    });
  };

  const handleSave = () => {
    if (selectedCount === 0) return;
    const payload = {
      startedAt: new Date(startedAt).toISOString(),
      entries: [...selections.entries()].map(([toy, involvement]) => ({ toy, involvement })),
    };
    const save = sessionId !== null ? updateSession(sessionId, payload) : createSession(payload);
    runToast(() => save, {
      busy: setSaving,
      onSuccess: () => {
        Toast.toast.success(t('savedToast'));
        router.push('/sessions');
      },
    });
  };

  const title = mode.kind === 'edit' ? t('editTitle') : t('newTitle');

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-100/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 items-center gap-3 px-6 py-3.5">
          <button
            type="button"
            onClick={() => router.push('/sessions')}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-900"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            {t('backToList')}
          </button>
          <h1 className="m-0 text-lg font-semibold tracking-tight text-neutral-900">{title}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-300 px-6 py-6 pb-24">
        {error && (
          <Alert status="danger" className="mb-4">
            <Alert.Description>{error}</Alert.Description>
          </Alert>
        )}

        <section className="mb-7">
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">{t('whenHeading')}</h2>
          <div className="inline-flex max-w-90 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
            <Clock size={16} className="text-neutral-500" />
            <input
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className="flex-1 border-0 bg-transparent text-sm tabular-nums text-neutral-900 outline-none"
            />
            <button
              type="button"
              onClick={() => setStartedAt(datetimeLocalNow())}
              className="rounded-md border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-white"
            >
              {t('nowButton')}
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">{t('toysHeading')}</h2>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <SearchInput value={query} onChange={setQuery} />
            <span className="text-sm text-neutral-500">{t('toysHint')}</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20 text-neutral-500">
              <Spinner />
            </div>
          ) : (
            <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {filteredToys.map((toy) => (
                <ToyChipSelector
                  key={toy.id}
                  toy={toy}
                  state={selections.get(toy.id) ?? null}
                  onChange={(next) => handlePick(toy.id, next)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 shadow-[0_-4px_16px_rgba(17,24,39,.06)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 items-center gap-3 px-6 py-3.5">
          <div className="text-sm text-neutral-900">
            <span className="font-semibold text-blue-600">{selectedCount}</span>{' '}
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
