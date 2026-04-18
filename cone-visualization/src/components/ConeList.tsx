'use client'

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { deleteToy, fetchCones, type Toy } from '../services/api';
import { useAsyncAction } from '../hooks/useAsyncAction';
import CollectionMenu from './CollectionMenu';
import ToyCard from './ToyCard';
import ToyEditModal from './ToyEditModal';
import UnitToggle from './UnitToggle';

export type { Toy } from '../services/api';

type EditorMode =
  | { kind: 'closed' }
  | { kind: 'new' }
  | { kind: 'edit'; toy: Toy };

const ConeList = () => {
  const [cones, setCones] = useState<Toy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChanged, setLastChanged] = useState(0);
  const [editorMode, setEditorMode] = useState<EditorMode>({ kind: 'closed' });
  const [openCardId, setOpenCardId] = useState<number | null>(null);

  const updateLastChanged = () => setLastChanged(Date.now());
  const runInline = useAsyncAction(setError);
  const runToast = useAsyncAction();

  const maxHeight = useMemo(
    () => Math.max(1, ...cones.map((c) => c.height.mm)),
    [cones],
  );

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
    setEditorMode({ kind: 'closed' });
    updateLastChanged();
  };

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-100/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 items-center gap-3 px-6 py-3.5">
          <h1 className="m-0">
            <CollectionMenu
              onImported={updateLastChanged}
              count={isLoading ? null : cones.length}
            />
          </h1>
          <div className="flex-1" />
          <UnitToggle />
          <button
            type="button"
            onClick={() => setEditorMode({ kind: 'new' })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 pt-2.25 pb-1.75 pl-2.5 pr-3.5 text-sm font-medium leading-none text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus size={14} strokeWidth={2.2} />
            New Toy
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-300 px-6 py-6">
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {isLoading ? (
          <div className="py-20 text-center text-sm text-neutral-500">Loading…</div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {cones.map((toy) => (
              <ToyCard
                key={toy.id}
                toy={toy}
                heightRatio={Math.max(0.15, toy.height.mm / maxHeight)}
                detailsOpen={openCardId === toy.id}
                onToggleDetails={() =>
                  setOpenCardId((cur) => (cur === toy.id ? null : toy.id))
                }
                onEdit={(t) => setEditorMode({ kind: 'edit', toy: t })}
                onDelete={handleDelete}
              />
            ))}
            <button
              type="button"
              onClick={() => setEditorMode({ kind: 'new' })}
              className="flex min-h-90 items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 text-neutral-500 transition-colors hover:border-blue-500 hover:bg-blue-50/40 hover:text-blue-700"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-lg leading-none">+</span>
                New toy
              </span>
            </button>
          </div>
        )}
      </main>

      {editorMode.kind !== 'closed' && (
        <ToyEditModal
          mode={editorMode.kind === 'new' ? { kind: 'new' } : { kind: 'edit', toy: editorMode.toy }}
          onClose={() => setEditorMode({ kind: 'closed' })}
          onSaved={handleEditorSaved}
        />
      )}
    </>
  );
};

export default ConeList;
