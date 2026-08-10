'use client';

import { Alert, Button, Spinner } from '@heroui/react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { useUnit } from '../../providers/UnitProvider';
import { FILTERS, type FilterKey } from '../../services/session';
import ActivityTracker from '../ActivityTracker';
import DisplayOptionsMenu from '../DisplayOptionsMenu';
import Switcher, { type SwitcherItem } from '../Switcher';
import TopBar from '../TopBar';
import GirthToggle from '../GirthToggle';
import UnitToggle from '../UnitToggle';
import EmptyState from './EmptyState';
import SessionRow from './SessionRow';
import TimeOfDayStrip from './TimeOfDayStrip';
import { useSessionList } from './useSessionList';

export default function SessionList() {
  const router = useRouter();
  const { unit } = useUnit();
  const data = useSessionList(unit);
  const t = useTranslations('session');
  const filterLongLabel = (key: FilterKey) => t(`filter.${key}`);
  const filterShortLabel = (key: FilterKey) => t(`filter.${key}Short`);
  const filterItems: SwitcherItem<FilterKey>[] = FILTERS.map((f) => ({
    key: f.key,
    label: filterLongLabel(f.key),
    shortLabel: f.hasShortLabel ? filterShortLabel(f.key) : undefined,
  }));

  return (
    <>
      <TopBar subtitle={data.isLoading ? null : `${data.sessionCount} ${t('recorded')}`} />
      <header className="sticky top-0 z-10 border-y border-border bg-surface-secondary/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 flex-wrap items-center gap-2 px-4 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-6">
          <Switcher
            items={filterItems}
            value={data.filter}
            onChange={data.setFilter}
            ariaLabel={t('filter.ariaLabel')}
          />
          <div className="hidden sm:contents">
            <UnitToggle />
            <GirthToggle />
          </div>
          <div className="flex-1" />
          <DisplayOptionsMenu>
            <UnitToggle />
            <GirthToggle />
          </DisplayOptionsMenu>
          <Button variant="primary" size="sm" className="max-sm:hidden" onPress={() => router.push('/sessions/new')}>
            <Plus size={14} strokeWidth={2.2} />
            <span className="hidden md:inline">{t('newButton')}</span>
          </Button>
        </div>
      </header>

      <Button
        variant="primary"
        size="sm"
        aria-label={t('newButton')}
        className="fixed bottom-5 right-5 z-30 h-12 w-12 rounded-full shadow-lg sm:hidden"
        onPress={() => router.push('/sessions/new')}
      >
        <Plus size={18} strokeWidth={2.2} />
      </Button>

      <main className="mx-auto max-w-300 px-6 pt-6 pb-28 sm:pb-6">
        {data.error && (
          <Alert status="danger" className="mb-4">
            <Alert.Description>{data.error}</Alert.Description>
          </Alert>
        )}
        {!data.isLoading && (
          <div className="mb-4 space-y-3">
            <ActivityTracker heatmap={data.heatmap} />
            <TimeOfDayStrip sessions={data.visibleSessions} />
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
