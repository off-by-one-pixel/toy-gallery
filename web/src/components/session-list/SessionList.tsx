'use client';

import { useState } from 'react';
import { Alert, Button, Spinner } from '@heroui/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useUnit } from '../../providers/UnitProvider';
import { deleteSession } from '../../services/api';
import { FILTERS, type FilterKey } from '../../services/session';
import { ActionFabs, type ActionDef } from '../ActionButtons';
import ActivityTracker from '../ActivityTracker';
import DisplayOptionsMenu from '../DisplayOptionsMenu';
import Switcher, { type SwitcherItem } from '../Switcher';
import TopBar from '../TopBar';
import GirthToggle from '../GirthToggle';
import UnitToggle from '../UnitToggle';
import EmptyState from './EmptyState';
import SessionRow from './SessionRow';
import TimeOfDayStrip from './TimeOfDayStrip';
import WeekdayStrip from './WeekdayStrip';
import { useSessionList } from './useSessionList';

export default function SessionList() {
  const router = useRouter();
  const { unit } = useUnit();
  const data = useSessionList(unit);
  const t = useTranslations('session');
  const common = useTranslations('common');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const runToast = useAsyncAction();

  const editSession = (id: number) => router.push(`/sessions/edit?id=${id}`);
  const removeSession = (id: number) => {
    if (!confirm(t('deleteConfirm'))) return;
    runToast(() => deleteSession(id), {
      onDone: () => {
        setSelectedId(null);
        data.reload();
      },
    });
  };

  const selectedActions: ActionDef[] | null =
    selectedId === null
      ? null
      : [
          {
            key: 'edit',
            label: common('edit'),
            icon: Pencil,
            variant: 'outline',
            onPress: () => editSession(selectedId),
          },
          {
            key: 'delete',
            label: common('delete'),
            icon: Trash2,
            variant: 'danger-soft',
            onPress: () => removeSession(selectedId),
          },
        ];
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

      <div className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-2.5 sm:hidden">
        {selectedActions && <ActionFabs actions={selectedActions} />}
        <Button
          variant="primary"
          size="sm"
          aria-label={t('newButton')}
          className="h-12 w-12 rounded-full shadow-lg"
          onPress={() => router.push('/sessions/new')}
        >
          <Plus size={18} strokeWidth={2.2} />
        </Button>
      </div>

      <main className="mx-auto max-w-300 px-6 pt-6 pb-28 sm:pb-6">
        {data.error && (
          <Alert status="danger" className="mb-4">
            <Alert.Description>{data.error}</Alert.Description>
          </Alert>
        )}
        {!data.isLoading && (
          <div className="mb-4">
            <ActivityTracker heatmap={data.heatmap}>
              <TimeOfDayStrip sessions={data.visibleSessions} />
              <WeekdayStrip sessions={data.visibleSessions} />
            </ActivityTracker>
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
          <SessionRow
            key={session.id}
            session={session}
            toysById={data.toysById}
            unit={unit}
            selected={selectedId === session.id}
            onToggleSelect={() => setSelectedId((cur) => (cur === session.id ? null : session.id))}
            onEdit={() => editSession(session.id)}
            onDelete={() => removeSession(session.id)}
          />
        ))}
      </div>
    );
  }
}
