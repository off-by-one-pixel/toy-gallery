'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Spinner } from '@heroui/react';
import { CalendarClock, Play, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { deleteToy, fetchToys } from '../services/api';
import type { Toy } from '../services/types';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useToyEditorWizardNav } from '../hooks/nav/useToyEditorWizardNav';
import { useToyModalNav } from '../hooks/nav/useToyModalNav';
import { useSort } from '../providers/SortProvider';
import { useViewMode, ViewMode } from '../providers/ViewModeProvider';
import { filterToys } from '../services/search';
import { sortToys } from '../services/sort';
import { ActionFabs, type ActionDef } from './ActionButtons';
import { toyActionDefs } from './ToyActionButtons';
import DisplayOptionsMenu from './DisplayOptionsMenu';
import SearchInput from './SearchInput';
import SortControl from './SortControl';
import TopBar from './TopBar';
import ToyCards from './ToyCards';
import ToyEditModal from './toy-edit/ToyEditModal';
import ToyList from './ToyList';
import GirthToggle from './GirthToggle';
import LiveSessionBanner from './LiveSessionBanner';
import { useLiveSession } from '../providers/LiveSessionProvider';
import UnitToggle from './UnitToggle';
import ViewToggle from './ViewToggle';

type EditorMode = { kind: 'closed' } | { kind: 'new' } | { kind: 'edit'; toy: Toy } | { kind: 'copy'; toy: Toy };

const ToyGallery = () => {
  const router = useRouter();
  const toyModal = useToyModalNav();
  const wizard = useToyEditorWizardNav();
  const t = useTranslations();
  const common = useTranslations('common');

  const [toys, setToys] = useState<Toy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChanged, setLastChanged] = useState(0);
  const [query, setQuery] = useState('');
  const [openCardId, setOpenCardId] = useState<number | null>(null);
  const toggleOpen = (id: number) => setOpenCardId((current) => (current === id ? null : id));
  const { view, setView } = useViewMode();
  const { sort } = useSort();
  const sortedToys = useMemo(() => sortToys(filterToys(toys, query), sort), [toys, sort, query]);

  const editorMode = useMemo<EditorMode>(() => {
    if (toyModal.kind === 'new') return { kind: 'new' };
    if ((toyModal.kind === 'edit' || toyModal.kind === 'copy') && toyModal.toyId != null) {
      const toy = toys.find((c) => c.id === toyModal.toyId);
      if (toy) return { kind: toyModal.kind, toy };
    }
    return { kind: 'closed' };
  }, [toyModal.kind, toyModal.toyId, toys]);

  const updateLastChanged = () => setLastChanged(Date.now());
  const runInline = useAsyncAction(setError);
  const runToast = useAsyncAction();
  const { liveSession, isLoaded: liveLoaded, start: startLive } = useLiveSession();
  const showStartLive = liveLoaded && !liveSession;

  useEffect(() => {
    runInline(fetchToys, {
      busy: setIsLoading,
      onSuccess: (loaded) => {
        setToys(loaded);
        setError(null);
      },
    });
  }, [lastChanged, runInline]);

  const handleDelete = async (toy: Toy) => {
    if (!confirm(t('toy.deleteConfirm', { brand: toy.brand, name: toy.name }))) return;
    await runToast(() => deleteToy(toy.id), { onDone: updateLastChanged });
  };

  const handleEditorSaved = () => {
    toyModal.close();
    updateLastChanged();
  };

  const handleEdit = (toy: Toy) => toyModal.openEdit(toy.id);
  const handleCopy = (toy: Toy) => toyModal.openCopy(toy.id);

  const newActions: ActionDef[] = [
    ...(showStartLive
      ? [
          {
            key: 'start-live',
            label: t('session.live.startButton'),
            icon: Play,
            variant: 'primary',
            fabClassName: 'bg-emerald-600 text-white hover:bg-emerald-500',
            fabIconSize: 22,
            onPress: () => void runToast(startLive),
          } satisfies ActionDef,
        ]
      : []),
    {
      key: 'new-session',
      label: t('session.newButton'),
      icon: CalendarClock,
      variant: 'outline',
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
        <div className="mx-auto flex max-w-300 flex-wrap items-center gap-2 px-4 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-6">
          <div className="min-w-0 flex-1 sm:w-auto sm:flex-initial">
            <SearchInput value={query} onChange={setQuery} />
          </div>
          <DisplayOptionsMenu>
            <ViewToggle view={view} onChange={setView} />
            <UnitToggle />
            <GirthToggle />
            {view === ViewMode.cards && <SortControl />}
          </DisplayOptionsMenu>
          <div className="hidden sm:contents">
            <ViewToggle view={view} onChange={setView} />
            <UnitToggle />
            <GirthToggle />
          </div>
          <div className="hidden flex-1 sm:block" />
          {showStartLive && (
            <Button
              variant="primary"
              size="sm"
              className="max-sm:hidden bg-emerald-600 text-white hover:bg-emerald-500"
              onPress={() => void runToast(startLive)}
            >
              <Play size={14} strokeWidth={2.2} />
              <span className="hidden md:inline">{t('session.live.startButton')}</span>
            </Button>
          )}
          <Button variant="outline" size="sm" className="max-sm:hidden" onPress={() => router.push('/sessions/new')}>
            <CalendarClock size={14} strokeWidth={1.8} />
            <span className="hidden md:inline">{t('session.newButton')}</span>
          </Button>
          <Button variant="primary" size="sm" className="max-sm:hidden" onPress={toyModal.openNew}>
            <Plus size={14} strokeWidth={2.2} />
            <span className="hidden md:inline">{t('toy.new')}</span>
          </Button>
        </div>
      </header>
      <LiveSessionBanner />

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
