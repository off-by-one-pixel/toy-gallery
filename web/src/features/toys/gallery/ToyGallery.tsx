'use client';

import { useCallback, useMemo, useState } from 'react';
import { Alert, Spinner } from '@heroui/react';
import { CalendarClock, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useNavigation } from '@/hooks/useNavigation';
import { routes } from '@/routes';
import type { Toy } from '@/api/types';
import { useToys } from '@/features/toys/useToys';
import { useToyModalNav } from '@/features/toys/gallery/useToyModalNav';
import { useSortOf } from '@/hooks/useSortOf';
import { useViewMode, ViewMode } from '@/features/preferences/useViewMode';
import { filterToys } from '@/features/toys/search';
import { sortToys, TOY_SORT } from '@/features/toys/toySort';
import { ActionFabs, type ActionDef } from '@/components/ActionButtons';
import { toyActionDefs, type ToyActions } from '@/features/toys/gallery/ToyActionButtons';
import type { GhostDimensions, GhostTarget, GhostToy } from '@/features/toys/gallery/ghost/ghosts';
import { useGhosts } from '@/features/toys/gallery/ghost/useGhosts';
import GhostModal from '@/features/toys/gallery/ghost/GhostModal';
import ClearGhostsButton from '@/features/toys/gallery/ghost/ClearGhostsButton';
import PageToolbar from '@/components/PageToolbar';
import SearchInput from '@/components/SearchInput';
import ToySortControl from '@/features/toys/gallery/ToySortControl';
import { useSetTopBarSubtitle } from '@/components/TopBarProvider';
import ToyCards from '@/features/toys/gallery/ToyCards';
import ConfirmModal from '@/components/ConfirmModal';
import ToyEditModal from '@/features/toys/editor/ToyEditModal';
import type { ToyEditMode } from '@/features/toys/editor/toyEditForm';
import ToyList from '@/features/toys/gallery/ToyList';
import { useStartLiveAction } from '@/features/sessions/live/useStartLiveAction';
import ViewToggle from '@/features/preferences/ViewToggle';

const ToyGallery = () => {
  const { navigate } = useNavigation();
  const toyModal = useToyModalNav();
  const t = useTranslations();
  const common = useTranslations('common');

  const { toys, isLoading, error, removeToy, isRemovingToy } = useToys();
  useSetTopBarSubtitle(isLoading ? null : t('toy.items', { count: toys.length }));
  const [query, setQuery] = useState('');
  const [openCardId, setOpenCardId] = useState<number | null>(null);
  const toggleOpen = useCallback((id: number) => setOpenCardId((current) => (current === id ? null : id)), []);
  const { view, setView } = useViewMode();
  const { sort } = useSortOf(TOY_SORT);
  const sortedToys = useMemo(() => sortToys(filterToys(toys, query), sort), [toys, sort, query]);

  const editMode = useMemo<ToyEditMode | null>(() => {
    if (toyModal.kind === 'new') return { kind: 'new' };
    if ((toyModal.kind === 'edit' || toyModal.kind === 'copy') && toyModal.toyId != null) {
      const toy = toys.find((c) => c.id === toyModal.toyId);
      if (toy) return { kind: toyModal.kind, toy };
    }
    return null;
  }, [toyModal.kind, toyModal.toyId, toys]);

  const startLiveAction = useStartLiveAction();

  const [pendingDelete, setPendingDelete] = useState<Toy | null>(null);
  const handleDelete = useCallback((toy: Toy) => setPendingDelete(toy), []);
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await removeToy(pendingDelete.id);
    setPendingDelete(null);
  };

  const handleEdit = useCallback((toy: Toy) => toyModal.openEdit(toy.id), [toyModal]);
  const handleCopy = useCallback((toy: Toy) => toyModal.openCopy(toy.id), [toyModal]);

  const { ghosts, canAddGhost, saveGhost, removeGhost, clearGhosts } = useGhosts();
  const [ghostModal, setGhostModal] = useState<GhostTarget | null>(null);
  const handleGhost = useCallback((toy: Toy) => setGhostModal({ kind: 'new', source: toy }), []);
  const toyActions = useMemo<ToyActions>(
    () => ({
      onEdit: handleEdit,
      onCopy: handleCopy,
      onDelete: handleDelete,
      onGhost: canAddGhost ? handleGhost : undefined,
    }),
    [handleEdit, handleCopy, handleDelete, canAddGhost, handleGhost],
  );
  const handleEditGhost = (ghost: GhostToy) => setGhostModal({ kind: 'edit', ghost });
  const handleGhostSave = (dims: GhostDimensions) => {
    if (ghostModal) saveGhost(ghostModal, dims);
    setGhostModal(null);
  };

  const newActions: ActionDef[] = [
    ...(startLiveAction ? [startLiveAction] : []),
    {
      key: 'new-session',
      label: t('session.newButton'),
      icon: CalendarClock,
      variant: 'outline',
      iconStrokeWidth: 1.8,
      onPress: () => navigate(routes.sessions.new),
    },
    { key: 'new-toy', label: t('toy.new'), icon: Plus, variant: 'primary', onPress: toyModal.openNew },
  ];

  const openToy = openCardId === null ? null : (toys.find((c) => c.id === openCardId) ?? null);
  const openToyActions = openToy ? toyActionDefs((k) => common(k), openToy, toyActions) : null;

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-20 text-muted">
          <Spinner />
        </div>
      );
    }
    const ghostCount = view === ViewMode.list ? 0 : ghosts.length;
    return (
      <>
        <div className={`mb-3 items-center justify-end gap-2 ${ghostCount > 0 ? 'flex' : 'hidden sm:flex'}`}>
          <ClearGhostsButton count={ghostCount} onClear={clearGhosts} />
          <div className="hidden sm:block">
            <ToySortControl toys={toys} />
          </div>
        </div>
        {view === ViewMode.list ? (
          <ToyList
            toys={sortedToys}
            openToyId={openCardId}
            onToggleOpen={toggleOpen}
            actions={{ ...toyActions, onGhost: undefined }}
          />
        ) : (
          <ToyCards
            toys={sortedToys}
            ghosts={ghosts}
            openToyId={openCardId}
            onToggleOpen={toggleOpen}
            actions={toyActions}
            onEditGhost={handleEditGhost}
            onRemoveGhost={removeGhost}
            onNew={toyModal.openNew}
          />
        )}
      </>
    );
  };

  return (
    <>
      <PageToolbar
        start={
          <div className="min-w-0 flex-1 sm:w-auto sm:flex-initial">
            <SearchInput value={query} onChange={setQuery} />
          </div>
        }
        menuExtrasStart={<ViewToggle view={view} onChange={setView} />}
        menuExtrasEnd={<ToySortControl toys={toys} />}
        inlineExtras={<ViewToggle view={view} onChange={setView} />}
        actions={newActions}
        growStart
      />

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-5 z-30 flex flex-col items-end gap-2.5 sm:hidden">
        {openToyActions && <ActionFabs actions={openToyActions} />}
        <ActionFabs actions={newActions} />
      </div>

      <main className="mx-auto max-w-300 px-6 pt-6 pb-28 sm:pb-34">
        {error && (
          <Alert status="danger" className="mb-4">
            <Alert.Description>{error}</Alert.Description>
          </Alert>
        )}
        {renderBody()}
      </main>

      {ghostModal && <GhostModal target={ghostModal} onSave={handleGhostSave} onClose={() => setGhostModal(null)} />}

      {pendingDelete && (
        <ConfirmModal
          onClose={() => setPendingDelete(null)}
          title={t('toy.deleteConfirm', { brand: pendingDelete.brand, name: pendingDelete.name })}
          confirmLabel={common('delete')}
          confirmVariant="danger"
          busy={isRemovingToy}
          onConfirm={() => void confirmDelete()}
        />
      )}

      {editMode && <ToyEditModal mode={editMode} onClose={toyModal.close} onSaved={toyModal.close} />}
    </>
  );
};

export default ToyGallery;
