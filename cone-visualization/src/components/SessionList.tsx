'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Spinner } from '@heroui/react';
import { ThumbnailRender } from 'cone-editor';
import type { Toy as EditorToy } from 'cone-editor';
import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { fetchActivity, fetchCones, fetchSessions } from '../services/api';
import { heightScale } from '../services/scaling';
import {
  Involvement,
  SectionShape,
  type ActivityDay,
  type Session,
  type SessionEntry,
  type Toy,
} from '../services/types';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useUnit } from '../providers/UnitProvider';
import { formatValue } from '../services/units';
import UnitToggle from './UnitToggle';
import {
  SESSION_EDIT_ARROW_LABEL,
  SESSION_EMPTY,
  SESSION_EMPTY_FILTERED_PREFIX,
  SESSION_FILTER_ALL,
  SESSION_FILTER_MONTH,
  SESSION_FILTER_WEEK,
  SESSION_PEAK_CIRCUMFERENCE,
  SESSION_PEAK_LENGTH,
  SESSION_TOY_DELETED,
  SESSIONS_NEW_BUTTON,
  SESSIONS_RECORDED,
} from '../labels';
import ActivityTracker from './ActivityTracker';
import CollectionMenu from './CollectionMenu';
import SectionTabs from './SectionTabs';

type FilterKey = 'all' | 'week' | 'month';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: SESSION_FILTER_ALL },
  { key: 'week', label: SESSION_FILTER_WEEK },
  { key: 'month', label: SESSION_FILTER_MONTH },
];

const DAY = 24 * 60 * 60 * 1000;

const STATE_FILTER_STYLE: Record<Involvement, React.CSSProperties> = {
  [Involvement.USED]: {},
  [Involvement.INSERTED]: { filter: 'saturate(0.35) opacity(0.5)' },
  [Involvement.FULLY_INSERTED]: {},
};

const STATE_RANK: Record<Involvement, number> = {
  [Involvement.USED]: 0,
  [Involvement.INSERTED]: 1,
  [Involvement.FULLY_INSERTED]: 2,
};

const formatWhen = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / DAY);
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Yesterday · ${time}`;
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${date} · ${time}`;
};

const isWithin = (iso: string, days: number) => {
  const t = new Date(iso).getTime();
  return Date.now() - t <= days * DAY;
};

export default function SessionList() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [toys, setToys] = useState<Toy[]>([]);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');

  const runInline = useAsyncAction(setError);
  const { unit } = useUnit();

  useEffect(() => {
    let cancelled = false;
    runInline(
      async () => {
        const [s, t, a] = await Promise.all([fetchSessions(), fetchCones(), fetchActivity()]);
        return { sessions: s, toys: t, activity: a };
      },
      {
        busy: setIsLoading,
        onSuccess: ({ sessions, toys, activity }) => {
          if (cancelled) return;
          setSessions(sessions);
          setToys(toys);
          setActivity(activity);
          setError(null);
        },
      },
    );
    return () => {
      cancelled = true;
    };
  }, [runInline]);

  const toysById = useMemo(() => new Map(toys.map((t) => [t.id, t])), [toys]);

  const visibleSessions = useMemo(() => {
    if (filter === 'all') return sessions;
    const days = filter === 'week' ? 7 : 30;
    return sessions.filter((s) => isWithin(s.startedAt, days));
  }, [sessions, filter]);

  return (
    <>
      <div className="bg-neutral-100/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
          <h1 className="m-0">
            <CollectionMenu
              onImported={() => {}}
              subtitle={isLoading ? null : `${sessions.length} ${SESSIONS_RECORDED}`}
            />
          </h1>
          <SectionTabs />
        </div>
      </div>
      <header className="sticky top-0 z-10 border-y border-neutral-200 bg-neutral-100/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 flex-wrap items-center gap-2 px-4 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-6">
          <div className="inline-flex gap-0.5 rounded-lg bg-neutral-200/70 p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors ' +
                  (filter === f.key ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900')
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          <UnitToggle />
          <div className="flex-1" />
          <Button variant="primary" size="sm" onPress={() => router.push('/sessions/new')}>
            <Plus size={14} strokeWidth={2.2} />
            <span className="hidden md:inline">{SESSIONS_NEW_BUTTON}</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-300 px-6 py-6">
        {error && (
          <Alert status="danger" className="mb-4">
            <Alert.Description>{error}</Alert.Description>
          </Alert>
        )}
        {!isLoading && (
          <div className="mb-4">
            <ActivityTracker days={activity} />
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center py-20 text-neutral-500">
            <Spinner />
          </div>
        ) : visibleSessions.length === 0 ? (
          <EmptyState anyExist={sessions.length > 0} filterLabel={FILTERS.find((f) => f.key === filter)?.label ?? ''} />
        ) : (
          <div className="flex flex-col gap-3.5">
            {visibleSessions.map((session) => (
              <SessionRow key={session.id} session={session} toysById={toysById} unit={unit} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function SessionRow({
  session,
  toysById,
  unit,
}: {
  session: Session;
  toysById: Map<number, Toy>;
  unit: ReturnType<typeof useUnit>['unit'];
}) {
  const STRIP_LIMIT = 5;
  const orderedEntries = [...session.entries].sort(
    (a, b) => STATE_RANK[a.involvement] - STATE_RANK[b.involvement],
  );
  const visibleEntries = orderedEntries.slice(0, STRIP_LIMIT);
  const overflow = orderedEntries.length - visibleEntries.length;

  const scale = heightScale(orderedEntries.map((e) => toysById.get(e.toy)));

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md sm:grid sm:grid-cols-[180px_1fr_auto_auto] sm:items-center sm:gap-6 sm:px-6 sm:py-5">
      <div className="flex items-center justify-between gap-3 sm:contents">
        <div className="text-base font-semibold tracking-tight text-neutral-900 sm:order-1">
          {formatWhen(session.startedAt)}
        </div>
        <Link
          href={`/sessions/edit?id=${session.id}`}
          aria-label={SESSION_EDIT_ARROW_LABEL}
          className="rounded-md p-1 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-blue-600 sm:order-4"
        >
          <ChevronRight size={20} />
        </Link>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 sm:mt-0 sm:contents">
        <div className="flex flex-wrap items-center gap-3 sm:order-2">
          {visibleEntries.map((entry) => {
            const toy = toysById.get(entry.toy);
            return <MiniToy key={entry.toy} entry={entry} toy={toy} heightRatio={scale(toy)} />;
          })}
          {overflow > 0 && (
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
              +{overflow} more
            </span>
          )}
        </div>
        <div className="min-w-32 text-right shrink-0 sm:order-3">
          <PeakRow label={SESSION_PEAK_LENGTH} mm={session.maxInsertableLength} unit={unit} />
          <PeakRow label={SESSION_PEAK_CIRCUMFERENCE} mm={session.maxCircumference} unit={unit} />
        </div>
      </div>
    </div>
  );
}

function MiniToy({
  entry,
  toy,
  heightRatio,
}: {
  entry: SessionEntry;
  toy: Toy | undefined;
  heightRatio: number;
}) {
  if (!toy) {
    return (
      <div className="flex w-20 flex-col items-center gap-1.5 text-center">
        <div className="h-14 w-10 rounded bg-neutral-200" />
        <div className="truncate text-xs text-neutral-400">{SESSION_TOY_DELETED}</div>
      </div>
    );
  }
  const editorToy: EditorToy = {
    sections: toy.shape.sections,
    topShape: toy.shape.topSectionShape ?? SectionShape.FLAT,
    bottomShape: toy.shape.bottomSectionShape ?? SectionShape.FLAT,
  };
  const fill = toy.color || '#c7e4ee';
  const isUsed = entry.involvement === Involvement.USED;
  const silhouetteStyle = {
    borderWidth: 1,
    borderColor: isUsed ? '#9ca3af' : '#1f2937',
    color: isUsed ? 'transparent' : fill,
  };
  const tooltip = [toy.brand, toy.name, toy.size].filter(Boolean).join(' ');
  return (
    <div className="flex w-20 flex-col items-center gap-1.5 text-center" title={tooltip}>
      <div className="relative h-14 w-full">
        <div
          className="absolute inset-x-0 bottom-0 flex items-end justify-center"
          style={{ top: `${(1 - heightRatio) * 100}%`, ...STATE_FILTER_STYLE[entry.involvement] }}
        >
          <ThumbnailRender toy={editorToy} scaleFactor={0.18} style={silhouetteStyle} />
        </div>
      </div>
      <div className="max-w-20 truncate text-sm text-neutral-900">
        {toy.name}
        {toy.size && <span className="text-neutral-500"> {toy.size}</span>}
      </div>
    </div>
  );
}

function PeakRow({ label, mm, unit }: { label: string; mm: number | null; unit: ReturnType<typeof useUnit>['unit'] }) {
  return (
    <div className="flex items-baseline justify-end gap-2 py-0.5">
      <span className="text-[11px] uppercase tracking-wider text-neutral-400">{label}</span>
      {mm == null ? (
        <span className="text-[17px] font-medium text-neutral-400">—</span>
      ) : (
        <span className="text-[17px] font-semibold tracking-tight tabular-nums text-neutral-900">
          {formatValue(mm, unit)}
          <span className="ml-1.5 text-[11px] font-medium text-neutral-500">{unit.id}</span>
        </span>
      )}
    </div>
  );
}

function EmptyState({ anyExist, filterLabel }: { anyExist: boolean; filterLabel: string }) {
  if (anyExist) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-12 text-center text-sm text-neutral-500">
        {SESSION_EMPTY_FILTERED_PREFIX}{' '}
        <span className="font-medium text-neutral-700">{filterLabel.toLowerCase()}</span>.
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center">
      <div className="text-sm text-neutral-500">{SESSION_EMPTY}</div>
      <Link
        href="/sessions/new"
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        <Plus size={14} strokeWidth={2.2} />
        {SESSIONS_NEW_BUTTON}
      </Link>
    </div>
  );
}
