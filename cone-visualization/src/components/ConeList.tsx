'use client'

import { useEffect, useMemo, useState } from 'react';
import { deleteToy, fetchCones } from '../services/api';
import ToyCard from './ToyCard';
import ToyEditModal from './ToyEditModal';

import type { Shape, ToySection } from 'cone-editor';

interface ApiCone {
  id: number;
  name: string;
  brand: string;
  size: string;
  color: string;
  height: number;
  diameter: number;
  shape: {
    top_section_shape: string;
    bottom_section_shape?: string;
    sections: ToySection[];
  };
}

export interface Toy {
  id: number;
  name: string;
  brand: string;
  size: string;
  color: string;
  height: number;
  diameter: number;
  topShape: Shape;
  bottomShape: Shape;
  sections: ToySection[];
}

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

  const updateLastChanged = () => setLastChanged(Date.now());

  const maxHeight = useMemo(
    () => Math.max(1, ...cones.map((c) => c.height)),
    [cones],
  );

  useEffect(() => {
    const loadCones = async () => {
      try {
        setIsLoading(true);
        const data = (await fetchCones()) as ApiCone[];
        const transformed: Toy[] = data.map((cone) => ({
          id: cone.id,
          name: cone.name,
          brand: cone.brand,
          size: cone.size,
          color: cone.color,
          height: cone.height,
          diameter: cone.diameter,
          topShape: cone.shape.top_section_shape.toLowerCase() as Shape,
          bottomShape: (cone.shape.bottom_section_shape || 'flat').toLowerCase() as Shape,
          sections: cone.shape.sections.map((s) => ({
            id: s.id,
            height: s.height,
            diameter: s.diameter,
          })),
        }));
        setCones(transformed);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadCones();
  }, [lastChanged]);

  const handleDelete = async (toy: Toy) => {
    if (!confirm(`Delete ${toy.brand} ${toy.name}?`)) return;
    try {
      await deleteToy(toy.id);
    } finally {
      updateLastChanged();
    }
  };

  const handleEditorSaved = () => {
    setEditorMode({ kind: 'closed' });
    updateLastChanged();
  };

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-100/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-300 items-center gap-3 px-6 py-3.5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
              Toy Gallery
              {!isLoading && (
                <span className="ml-2 text-sm font-normal text-neutral-500">
                  {cones.length} {cones.length === 1 ? 'item' : 'items'}
                </span>
              )}
            </h1>
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setEditorMode({ kind: 'new' })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 pt-2.25 pb-1.75 pl-2.5 pr-3.5 text-sm font-medium leading-none text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
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
                heightRatio={Math.max(0.15, toy.height / maxHeight)}
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
