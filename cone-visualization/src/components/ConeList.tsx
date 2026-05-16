'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Spinner } from '@heroui/react';
import { CalendarClock, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteToy, fetchCones } from '../services/api';
import type { Toy } from '../services/types';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { usePasswordModalNav } from '../hooks/nav/usePasswordModalNav';
import { useToyEditorWizardNav } from '../hooks/nav/useToyEditorWizardNav';
import { useToyModalNav } from '../hooks/nav/useToyModalNav';
import { useSort } from '../providers/SortProvider';
import { useViewMode, ViewMode } from '../providers/ViewModeProvider';
import { TOY_ITEM_PLURAL, TOY_ITEM_SINGULAR } from '../labels';
import { filterToys } from '../services/search';
import { heightScale } from '../services/scaling';
import { sortToys } from '../services/sort';
import SearchInput from './SearchInput';
import SortControl from './SortControl';
import TopBar from './TopBar';
import ToyCard from './ToyCard';
import ToyEditModal from './ToyEditModal';
import ToyList from './ToyList';
import UnitToggle from './UnitToggle';
import ViewToggle from './ViewToggle';

export type { Toy } from '../services/types';

type EditorMode = { kind: 'closed' } | { kind: 'new' } | { kind: 'edit'; toy: Toy } | { kind: 'copy'; toy: Toy };

const ConeList = () => {
  const router = useRouter();
  const toyModal = useToyModalNav();
  const wizard = useToyEditorWizardNav();
  const password = usePasswordModalNav();

  const [cones, setCones] = useState<Toy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChanged, setLastChanged] = useState(0);
  const [query, setQuery] = useState('');
  const [openCardId, setOpenCardId] = useState<number | null>(null);
  const toggleOpen = (id: number) => setOpenCardId((current) => (current === id ? null : id));
  const { view } = useViewMode();
  const { sort } = useSort();
  const sortedCones = useMemo(() => sortToys(filterToys(cones, query), sort), [cones, sort, query]);

  const editorMode = useMemo<EditorMode>(() => {
    if (toyModal.kind === 'new') return { kind: 'new' };
    if ((toyModal.kind === 'edit' || toyModal.kind === 'copy') && toyModal.toyId != null) {
      const toy = cones.find((t) => t.id === toyModal.toyId);
      if (toy) return { kind: toyModal.kind, toy };
    }
    return { kind: 'closed' };
  }, [toyModal.kind, toyModal.toyId, cones]);

  const updateLastChanged = () => setLastChanged(Date.now());
  const runInline = useAsyncAction(setError);
  const runToast = useAsyncAction();

  const scale = useMemo(() => heightScale(sortedCones), [sortedCones]);

  useEffect(() => {
    runInline(fetchCones, {
      busy: setIsLoading,
      onSuccess: (loaded) => {
        setCones(loaded);
        setError(null);
      },
    });
  }, [lastChanged, runInline]);

  const handleDelete = async (toy: Toy) => {
    if (!confirm(`Delete ${toy.brand} ${toy.name}?`)) return;
    await runToast(() => deleteToy(toy.id), { onDone: updateLastChanged });
  };

  const handleEditorSaved = () => {
    toyModal.close();
    updateLastChanged();
  };

  return (
    <>
      <TopBar
        subtitle={isLoading ? null : `${cones.length} ${cones.length === 1 ? TOY_ITEM_SINGULAR : TOY_ITEM_PLURAL}`}
        onImported={updateLastChanged}
        onChangePassword={password.open}
      />
      <header className="sticky top-0 z-10 border-y border-neutral-200 bg-neutral-100/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 flex-wrap items-center gap-2 px-4 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-6">
          <div className="w-full sm:w-auto">
            <SearchInput value={query} onChange={setQuery} />
          </div>
          <ViewToggle />
          <UnitToggle />
          <div className="flex-1" />
          <Button variant="outline" size="sm" onPress={() => router.push('/sessions/new')}>
            <CalendarClock size={14} strokeWidth={1.8} />
            <span className="hidden md:inline">New session</span>
          </Button>
          <Button variant="primary" size="sm" onPress={toyModal.openNew}>
            <Plus size={14} strokeWidth={2.2} />
            <span className="hidden md:inline">New Toy</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-300 px-6 py-6">
        {error && (
          <Alert status="danger" className="mb-4">
            <Alert.Description>{error}</Alert.Description>
          </Alert>
        )}
        {isLoading ? (
          <div className="flex justify-center py-20 text-neutral-500">
            <Spinner />
          </div>
        ) : view === ViewMode.list ? (
          <ToyList
            toys={sortedCones}
            openToyId={openCardId}
            onToggleOpen={toggleOpen}
            onEdit={(t) => toyModal.openEdit(t.id)}
            onCopy={(t) => toyModal.openCopy(t.id)}
            onDelete={handleDelete}
          />
        ) : (
          <>
            <div className="mb-3 flex justify-end">
              <SortControl />
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {sortedCones.map((toy) => (
                <ToyCard
                  key={toy.id}
                  toy={toy}
                  heightRatio={scale(toy)}
                  detailsOpen={openCardId === toy.id}
                  onToggleDetails={() => toggleOpen(toy.id)}
                  onEdit={(t) => toyModal.openEdit(t.id)}
                  onCopy={(t) => toyModal.openCopy(t.id)}
                  onDelete={handleDelete}
                />
              ))}
              <button
                type="button"
                onClick={toyModal.openNew}
                className="flex min-h-90 items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 text-neutral-500 transition-colors hover:border-blue-500 hover:bg-blue-50/40 hover:text-blue-700"
              >
                <span className="inline-flex items-center gap-2 font-medium">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-lg leading-none">
                    +
                  </span>
                  <span>New toy</span>
                </span>
              </button>
            </div>
          </>
        )}
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

export default ConeList;
