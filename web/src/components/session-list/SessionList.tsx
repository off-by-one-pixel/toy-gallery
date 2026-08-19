'use client';

import { useState } from 'react';
import { Alert, Spinner } from '@heroui/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useStartLiveAction } from '../../hooks/useStartLiveAction';
import { useLiveSession } from '../../providers/LiveSessionProvider';
import { useUnit } from '../../providers/UnitProvider';
import { deleteSession } from '../../services/api';
import { FILTERS, type FilterKey } from '../../services/session';
import type { Session } from '../../services/types';
import { ActionBar, ActionFabs, type ActionDef } from '../ActionButtons';
import DisplayOptionsMenu from '../DisplayOptionsMenu';
import LiveSessionBanner from '../LiveSessionBanner';
import Switcher, { type SwitcherItem } from '../Switcher';
import TopBar from '../TopBar';
import GirthToggle from '../GirthToggle';
import UnitToggle from '../UnitToggle';
import EmptyState from './EmptyState';
import SessionRow from './SessionRow';
import SessionStats from './SessionStats';
import { useSessionList } from './useSessionList';

export default function SessionList() {
  const router = useRouter();
  const { unit } = useUnit();
  const data = useSessionList();
  const t = useTranslations('session');
  const common = useTranslations('common');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);
  const runToast = useAsyncAction();
  const { refresh: refreshLive } = useLiveSession();

  const addStartedSession = (session: Session) => {
    data.prependSession(session);
    setFlashId(session.id);
  };

  const startLiveAction = useStartLiveAction(addStartedSession);

  const editSession = (id: number) => router.push(`/sessions/edit?id=${id}`);
  const removeSession = (id: number) => {
    if (!confirm(t('deleteConfirm'))) return;
    runToast(() => deleteSession(id), {
      onDone: () => {
        setSelectedId(null);
        data.reload();
        void refreshLive();
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
  const newActions: ActionDef[] = [
    ...(startLiveAction ? [startLiveAction] : []),
    {
      key: 'new',
      label: t('newButton'),
      icon: Plus,
      variant: 'primary',
      onPress: () => router.push('/sessions/new'),
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
        <LiveSessionBanner />
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
          <ActionBar actions={newActions} />
        </div>
      </header>

      <div className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-2.5 sm:hidden">
        {selectedActions && <ActionFabs actions={selectedActions} />}
        <ActionFabs actions={newActions} />
      </div>

      <main className="mx-auto max-w-300 px-6 pt-6 pb-28 sm:pb-6">
        {data.error && (
          <Alert status="danger" className="mb-4">
            <Alert.Description>{data.error}</Alert.Description>
          </Alert>
        )}
        <SessionStats filter={data.filter} />
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
            hasMedia={data.mediaSessionIds.has(session.id)}
            selected={selectedId === session.id}
            flash={flashId === session.id}
            onToggleSelect={() => setSelectedId((cur) => (cur === session.id ? null : session.id))}
            onEdit={() => editSession(session.id)}
            onDelete={() => removeSession(session.id)}
          />
        ))}
      </div>
    );
  }
}
