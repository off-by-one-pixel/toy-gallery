'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Spinner } from '@heroui/react';
import { CalendarClock, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { deleteToy, fetchToys } from '@/api';
import { formatError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import type { Toy } from '@/api/types';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useToyEditorWizardNav } from '@/features/toys/editor/useToyEditorWizardNav';
import { useToyModalNav } from '@/features/toys/gallery/useToyModalNav';
import { useSortOf } from '@/hooks/useSortOf';
import { useViewMode, ViewMode } from '@/features/preferences/ViewModeProvider';
import { filterToys } from '@/features/toys/search';
import { sortToys, TOY_SORT } from '@/features/toys/toySort';
import { ActionBar, ActionFabs, type ActionDef } from '@/components/ActionButtons';
import { toyActionDefs } from '@/features/toys/gallery/ToyActionButtons';
import DisplayOptionsMenu from '@/components/DisplayOptionsMenu';
import SearchInput from '@/components/SearchInput';
import ToySortControl from '@/features/toys/gallery/ToySortControl';
import TopBar from '@/components/TopBar';
import ToyCards from '@/features/toys/gallery/ToyCards';
import ToyEditModal from '@/features/toys/editor/ToyEditModal';
import ToyList from '@/features/toys/gallery/ToyList';
import GirthToggle from '@/features/preferences/GirthToggle';
import LiveSessionBanner from '@/features/sessions/live/LiveSessionBanner';
import { useStartLiveAction } from '@/features/sessions/live/useStartLiveAction';
import UnitToggle from '@/features/preferences/UnitToggle';
import ViewToggle from '@/features/preferences/ViewToggle';

type EditorMode = { kind: 'closed' } | { kind: 'new' } | { kind: 'edit'; toy: Toy } | { kind: 'copy'; toy: Toy };

const ToyGallery = () => {
  const router = useRouter();
  const toyModal = useToyModalNav();
  const wizard = useToyEditorWizardNav();
  const t = useTranslations();
  const common = useTranslations('common');

  const queryClient = useQueryClient();
  const {
    data: toysData,
    isPending: isLoading,
    error: toysError,
  } = useQuery({ queryKey: queryKeys.toys.all, queryFn: fetchToys });
  const toys = useMemo(() => toysData ?? [], [toysData]);
  const error = toysError ? formatError(toysError) : null;
  const [query, setQuery] = useState('');
  const [openCardId, setOpenCardId] = useState<number | null>(null);
  const toggleOpen = (id: number) => setOpenCardId((current) => (current === id ? null : id));
  const { view, setView } = useViewMode();
  const { sort } = useSortOf(TOY_SORT);
  const sortedToys = useMemo(() => sortToys(filterToys(toys, query), sort), [toys, sort, query]);

  const editorMode = useMemo<EditorMode>(() => {
    if (toyModal.kind === 'new') return { kind: 'new' };
    if ((toyModal.kind === 'edit' || toyModal.kind === 'copy') && toyModal.toyId != null) {
      const toy = toys.find((c) => c.id === toyModal.toyId);
      if (toy) return { kind: toyModal.kind, toy };
    }
    return { kind: 'closed' };
  }, [toyModal.kind, toyModal.toyId, toys]);

  const invalidateToys = () => void queryClient.invalidateQueries({ queryKey: queryKeys.toys.all });
  const runToast = useAsyncAction();
  const startLiveAction = useStartLiveAction();

  const handleDelete = async (toy: Toy) => {
    if (!confirm(t('toy.deleteConfirm', { brand: toy.brand, name: toy.name }))) return;
    await runToast(() => deleteToy(toy.id), { onDone: invalidateToys });
  };

  const handleEditorSaved = () => {
    toyModal.close();
    invalidateToys();
  };

  const handleEdit = (toy: Toy) => toyModal.openEdit(toy.id);
  const handleCopy = (toy: Toy) => toyModal.openCopy(toy.id);

  const newActions: ActionDef[] = [
    ...(startLiveAction ? [startLiveAction] : []),
    {
      key: 'new-session',
      label: t('session.newButton'),
      icon: CalendarClock,
      variant: 'outline',
      iconStrokeWidth: 1.8,
      onPress: () => router.push('/sessions/new'),
    },
    { key: 'new-toy', label: t('toy.new'), icon: Plus, variant: 'primary', onPress: toyModal.openNew },
  ];

  const openToy = openCardId === null ? null : (toys.find((c) => c.id === openCardId) ?? null);
  const openToyActions = openToy
    ? toyActionDefs((k) => common(k), {
        onEdit: () => handleEdit(openToy),
        onCopy: () => handleCopy(openToy),
        onDelete: () => handleDelete(openToy),
      })
    : null;

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-20 text-muted">
          <Spinner />
        </div>
      );
    }
    if (view === ViewMode.list) {
      return (
        <ToyList
          toys={sortedToys}
          openToyId={openCardId}
          onToggleOpen={toggleOpen}
          onEdit={handleEdit}
          onCopy={handleCopy}
          onDelete={handleDelete}
        />
      );
    }
    return (
      <ToyCards
        toys={sortedToys}
        openToyId={openCardId}
        onToggleOpen={toggleOpen}
        onEdit={handleEdit}
        onCopy={handleCopy}
        onDelete={handleDelete}
        onNew={toyModal.openNew}
      />
    );
  };

  return (
    <>
      <TopBar subtitle={isLoading ? null : t('toy.items', { count: toys.length })} />
      <header className="sticky top-0 z-10 border-y border-border bg-surface-secondary/90 backdrop-blur-sm">
        <LiveSessionBanner />
        <div className="mx-auto flex max-w-300 flex-wrap items-center gap-2 px-4 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-6">
          <div className="min-w-0 flex-1 sm:w-auto sm:flex-initial">
            <SearchInput value={query} onChange={setQuery} />
          </div>
          <DisplayOptionsMenu>
            <ViewToggle view={view} onChange={setView} />
            <UnitToggle />
            <GirthToggle />
            {view === ViewMode.cards && <ToySortControl />}
          </DisplayOptionsMenu>
          <div className="hidden sm:contents">
            <ViewToggle view={view} onChange={setView} />
            <UnitToggle />
            <GirthToggle />
          </div>
          <div className="hidden flex-1 sm:block" />
          <ActionBar actions={newActions} />
        </div>
      </header>

      <div className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-2.5 sm:hidden">
        {openToyActions && <ActionFabs actions={openToyActions} />}
        <ActionFabs actions={newActions} />
      </div>

      <main className="mx-auto max-w-300 px-6 pt-6 pb-28 sm:pb-6">
        {error && (
          <Alert status="danger" className="mb-4">
            <Alert.Description>{error}</Alert.Description>
          </Alert>
        )}
        {renderBody()}
      </main>

      {editorMode.kind !== 'closed' && (
        <ToyEditModal
          mode={editorMode}
          stage={wizard.stage}
          step={wizard.step}
          dialog={wizard.dialog}
          onStageChange={wizard.goToStage}
          onStepChange={wizard.goToStep}
          onDialogChange={(d) => (d ? wizard.openDialog(d) : wizard.closeDialog())}
          onClose={toyModal.close}
          onSaved={handleEditorSaved}
        />
      )}
    </>
  );
};

export default ToyGallery;
