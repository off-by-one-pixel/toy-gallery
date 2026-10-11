'use client';

import { useCallback, useRef, useState } from 'react';
import { Alert, Spinner } from '@heroui/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useNavigation } from '@/hooks/useNavigation';

import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useStartLiveAction } from '@/features/sessions/live/useStartLiveAction';
import { SortProvider } from '@/providers/SortProvider';
import { useUnit } from '@/features/preferences/useUnit';
import { activeFilterCount, currentPeriod, FILTERS, type FilterKey, periodLabel } from '@/features/sessions/session';
import { SESSION_SORT } from '@/features/sessions/sessionSort';
import type { Session } from '@/api/types';
import { ActionFabs, type ActionDef } from '@/components/ActionButtons';
import PageToolbar from '@/components/PageToolbar';
import Switcher, { type SwitcherItem } from '@/components/Switcher';
import ConfirmModal from '@/components/ConfirmModal';
import { useSetTopBarSubtitle } from '@/components/TopBarProvider';
import EmptyState from '@/features/sessions/list/EmptyState';
import SessionFilterChips from '@/features/sessions/list/filter/SessionFilterChips';
import SessionFilterControl from '@/features/sessions/list/filter/SessionFilterControl';
import PeriodStepper from '@/features/sessions/list/PeriodStepper';
import SessionRow from '@/features/sessions/list/SessionRow';
import SessionSortControl from '@/features/sessions/list/SessionSortControl';
import { useSessionSelectionNav } from '@/features/sessions/list/useSessionSelectionNav';
import SessionStats from '@/features/sessions/stats/SessionStats';
import { useSessions } from '@/features/sessions/useSessions';

export default function SessionList() {
  return (
    <SortProvider config={SESSION_SORT}>
      <SessionListContent />
    </SortProvider>
  );
}

function SessionListContent() {
  const { navigate } = useNavigation();
  const { unit } = useUnit();
  const data = useSessions();
  const filterArgs = {
    toys: data.toys,
    toysById: data.toysById,
    period: data.period,
    filters: data.sessionFilters,
    onChange: data.setSessionFilters,
  };
  const t = useTranslations('session');
  const locale = useLocale();
  const common = useTranslations('common');
  useSetTopBarSubtitle(data.isLoading ? null : `${data.sessionCount} ${t('recorded')}`);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const {
    selectedId,
    selectedRowRef,
    toggle: toggleSelect,
    clear: clearSelection,
  } = useSessionSelectionNav(data.sessions.map((session) => session.id));
  const [flashId, setFlashId] = useState<number | null>(null);

  const addStartedSession = (session: Session) => {
    data.prependSession(session);
    setFlashId(session.id);
  };

  const startLiveAction = useStartLiveAction(addStartedSession);

  const editSession = useCallback((id: number) => navigate(`/sessions/edit?id=${id}`), [navigate]);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const removeSession = useCallback((id: number) => setPendingDeleteId(id), []);
  const confirmRemove = async () => {
    if (pendingDeleteId === null) return;
    await data.removeSession(pendingDeleteId);
    clearSelection();
    setPendingDeleteId(null);
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
      onPress: () => navigate('/sessions/new'),
    },
  ];

  useInfiniteScroll(sentinelRef, data.loadMore, data.hasMore && !data.isLoading && !data.isLoadingMore);

  const filterItems: SwitcherItem<FilterKey>[] = FILTERS.map((key) => ({
    key,
    label: t(`filter.${key}`),
  }));

  return (
    <>
      <PageToolbar
        start={
          <>
            <Switcher
              items={filterItems}
              value={data.period.kind}
              onChange={(kind) => data.setPeriod(currentPeriod(kind))}
              ariaLabel={t('filter.ariaLabel')}
            />
            <SessionFilterControl {...filterArgs} />
          </>
        }
        menuExtrasEnd={<SessionSortControl />}
        actions={newActions}
      >
        {data.period.kind !== 'all' && (
          <div className="flex justify-center pb-2.5">
            <PeriodStepper period={data.period} onChange={data.setPeriod} />
          </div>
        )}
        <SessionFilterChips {...filterArgs} />
      </PageToolbar>

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-5 z-30 flex flex-col items-end gap-2.5 sm:hidden">
        {selectedActions && <ActionFabs actions={selectedActions} />}
        <ActionFabs actions={newActions} />
      </div>

      <main className="mx-auto max-w-300 px-6 pt-6 pb-28 sm:pb-6">
        {data.error && (
          <Alert status="danger" className="mb-4">
            <Alert.Description>{data.error}</Alert.Description>
          </Alert>
        )}
        <SessionStats period={data.period} sessionFilters={data.sessionFilters} />
        <div className="mt-4 mb-3 hidden justify-end sm:flex">
          <SessionSortControl />
        </div>
        {renderBody()}
      </main>

      {pendingDeleteId !== null && (
        <ConfirmModal
          onClose={() => setPendingDeleteId(null)}
          title={t('deleteConfirm')}
          confirmLabel={common('delete')}
          confirmVariant="danger"
          busy={data.isRemovingSession}
          onConfirm={() => void confirmRemove()}
        />
      )}
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
    if (data.sessions.length === 0) {
      return (
        <EmptyState
          anyExist={data.sessionCount > 0 || data.period.kind !== 'all' || activeFilterCount(data.sessionFilters) > 0}
          filterLabel={data.period.kind === 'all' ? t('filter.all').toLowerCase() : periodLabel(data.period, locale)}
        />
      );
    }
    return (
      <div className="flex flex-col gap-3.5">
        {data.sessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            toysById={data.toysById}
            unit={unit}
            selected={selectedId === session.id}
            flash={flashId === session.id}
            ref={selectedId === session.id ? selectedRowRef : undefined}
            onToggleSelect={toggleSelect}
            onEdit={editSession}
            onDelete={removeSession}
          />
        ))}
        {data.isLoadingMore && (
          <div className="flex justify-center py-4 text-muted">
            <Spinner />
          </div>
        )}
        <div ref={sentinelRef} aria-hidden />
      </div>
    );
  }
}
