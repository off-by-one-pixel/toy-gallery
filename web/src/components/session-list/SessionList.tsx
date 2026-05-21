'use client';

import { Alert, Button, Spinner } from '@heroui/react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { usePasswordModalNav } from '../../hooks/nav/usePasswordModalNav';
import { SESSIONS_NEW_BUTTON, SESSIONS_RECORDED } from '../../labels';
import { useUnit } from '../../providers/UnitProvider';
import { FILTERS, filterLabel } from '../../services/session';
import ActivityTracker from '../ActivityTracker';
import TopBar from '../TopBar';
import UnitToggle from '../UnitToggle';
import EmptyState from './EmptyState';
import SessionRow from './SessionRow';
import { useSessionList } from './useSessionList';

export default function SessionList() {
  const router = useRouter();
  const password = usePasswordModalNav();
  const { unit } = useUnit();
  const data = useSessionList(unit);

  return (
    <>
      <TopBar
        subtitle={data.isLoading ? null : `${data.sessionCount} ${SESSIONS_RECORDED}`}
        onImported={() => {}}
        onChangePassword={password.open}
      />
      <header className="sticky top-0 z-10 border-y border-neutral-200 bg-neutral-100/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 flex-wrap items-center gap-2 px-4 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-6">
          <div className="inline-flex gap-0.5 rounded-lg bg-neutral-200/70 p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => data.setFilter(f.key)}
                className={
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors ' +
                  (data.filter === f.key
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900')
                }
              >
                {f.shortLabel ? (
                  <>
                    <span className="sm:hidden">{f.shortLabel}</span>
                    <span className="hidden sm:inline">{f.label}</span>
                  </>
                ) : (
                  f.label
                )}
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
        {data.error && (
          <Alert status="danger" className="mb-4">
            <Alert.Description>{data.error}</Alert.Description>
          </Alert>
        )}
        {!data.isLoading && (
          <div className="mb-4">
            <ActivityTracker heatmap={data.heatmap} />
          </div>
        )}
        {renderBody()}
      </main>
    </>
  );

  function renderBody() {
    if (data.isLoading) {
      return (
        <div className="flex justify-center py-20 text-neutral-500">
          <Spinner />
        </div>
      );
    }
    if (data.visibleSessions.length === 0) {
      return <EmptyState anyExist={data.sessionCount > 0} filterLabel={filterLabel(data.filter)} />;
    }
    return (
      <div className="flex flex-col gap-3.5">
        {data.visibleSessions.map((session) => (
          <SessionRow key={session.id} session={session} toysById={data.toysById} unit={unit} />
        ))}
      </div>
    );
  }
}
