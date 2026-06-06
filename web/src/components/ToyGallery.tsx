'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Spinner } from '@heroui/react';
import { CalendarClock, Plus } from 'lucide-react';
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
import SearchInput from './SearchInput';
import TopBar from './TopBar';
import ToyCards from './ToyCards';
import ToyEditModal from './toy-edit/ToyEditModal';
import ToyList from './ToyList';
import UnitToggle from './UnitToggle';
import ViewToggle from './ViewToggle';

type EditorMode = { kind: 'closed' } | { kind: 'new' } | { kind: 'edit'; toy: Toy } | { kind: 'copy'; toy: Toy };

const ToyGallery = () => {
  const router = useRouter();
  const toyModal = useToyModalNav();
  const wizard = useToyEditorWizardNav();
  const t = useTranslations();

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
          <div className="w-full sm:w-auto">
            <SearchInput value={query} onChange={setQuery} />
          </div>
          <ViewToggle view={view} onChange={setView} />
          <UnitToggle />
          <div className="flex-1" />
          <Button variant="outline" size="sm" onPress={() => router.push('/sessions/new')}>
            <CalendarClock size={14} strokeWidth={1.8} />
            <span className="hidden md:inline">{t('session.newButton')}</span>
          </Button>
          <Button variant="primary" size="sm" onPress={toyModal.openNew}>
            <Plus size={14} strokeWidth={2.2} />
            <span className="hidden md:inline">{t('toy.new')}</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-300 px-6 py-6">
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
