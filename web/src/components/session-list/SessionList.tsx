'use client';

import { Alert, Button, Spinner } from '@heroui/react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { useUnit } from '../../providers/UnitProvider';
import { FILTERS } from '../../services/session';
import ActivityTracker from '../ActivityTracker';
import TopBar from '../TopBar';
import UnitToggle from '../UnitToggle';
import EmptyState from './EmptyState';
import SessionRow from './SessionRow';
import { useSessionList } from './useSessionList';

export default function SessionList() {
  const router = useRouter();
  const { unit } = useUnit();
  const data = useSessionList(unit);
  const t = useTranslations('session');
  const filterLongLabel = (key: 'all' | 'week' | 'month') => t(`filter.${key}`);
  const filterShortLabel = (key: 'all' | 'week' | 'month') => t(`filter.${key}Short`);

  return (
    <>
      <TopBar subtitle={data.isLoading ? null : `${data.sessionCount} ${t('recorded')}`} />
      <header className="sticky top-0 z-10 border-y border-border bg-surface-secondary/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 flex-wrap items-center gap-2 px-4 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-6">
          <div className="inline-flex gap-0.5 rounded-lg bg-surface-tertiary/70 p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => data.setFilter(f.key)}
                className={
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors ' +
                  (data.filter === f.key ? 'bg-surface text-foreground shadow-xs' : 'text-muted hover:text-foreground')
                }
              >
                {f.hasShortLabel ? (
                  <>
                    <span className="sm:hidden">{filterShortLabel(f.key)}</span>
                    <span className="hidden sm:inline">{filterLongLabel(f.key)}</span>
                  </>
                ) : (
                  filterLongLabel(f.key)
                )}
              </button>
            ))}
          </div>
          <UnitToggle />
          <div className="flex-1" />
          <Button variant="primary" size="sm" onPress={() => router.push('/sessions/new')}>
            <Plus size={14} strokeWidth={2.2} />
            <span className="hidden md:inline">{t('newButton')}</span>
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
        <div className="flex justify-center py-20 text-muted">
          <Spinner />
        </div>
      );
    }
    if (data.visibleSessions.length === 0) {
      return <EmptyState anyExist={data.sessionCount > 0} filterLabel={filterLongLabel(data.filter)} />;
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
