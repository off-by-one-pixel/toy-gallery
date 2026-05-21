'use client';

import { Chip } from '@heroui/react';
import { ThumbnailRender } from 'toy-editor';
import { Check } from 'lucide-react';

import { INVOLVEMENT_LABEL } from '../labels';
import { toyShapeToEditor } from '../services/converters/toyShape';
import { Involvement, type Toy } from '../services/types';

type Props = Readonly<{
  toy: Toy;
  state: Involvement | null;
  onChange: (next: Involvement | null) => void;
}>;

const STATE_ORDER: Involvement[] = [Involvement.USED, Involvement.INSERTED, Involvement.FULLY_INSERTED];

const CHIP_BORDER: Record<Involvement, string> = {
  [Involvement.USED]: 'border-blue-300',
  [Involvement.INSERTED]: 'border-blue-500',
  [Involvement.FULLY_INSERTED]: 'border-blue-800',
};

const CHIP_CHECK: Record<Involvement, string> = {
  [Involvement.USED]: 'bg-blue-100 border-blue-300 text-blue-800',
  [Involvement.INSERTED]: 'bg-blue-400 border-blue-500 text-white',
  [Involvement.FULLY_INSERTED]: 'bg-blue-700 border-blue-800 text-white',
};

const SEG_ACTIVE: Record<Involvement, string> = {
  [Involvement.USED]: 'bg-blue-100 text-blue-800 shadow-xs',
  [Involvement.INSERTED]: 'bg-blue-400 text-white shadow-xs',
  [Involvement.FULLY_INSERTED]: 'bg-blue-700 text-white shadow-xs',
};

const STATE_CYCLE: (Involvement | null)[] = [null, Involvement.USED, Involvement.INSERTED, Involvement.FULLY_INSERTED];

const nextInCycle = (current: Involvement | null): Involvement | null => {
  const idx = STATE_CYCLE.indexOf(current);
  return STATE_CYCLE[(idx + 1) % STATE_CYCLE.length];
};

export default function ToyChipSelector({ toy, state, onChange }: Props) {
  const editorToy = toyShapeToEditor(toy.shape);

  const silhouetteStyle = {
    borderWidth: 1.25,
    borderColor: '#1f2937',
    color: toy.color || '#c7e4ee',
  };

  const handlePick = (next: Involvement) => {
    onChange(state === next ? null : next);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onChange(nextInCycle(state))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(nextInCycle(state));
        }
      }}
      className={
        'relative cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ' +
        (state ? CHIP_BORDER[state] : 'border-neutral-200')
      }
    >
      <div className="relative h-35 border-b border-neutral-200 bg-linear-to-br from-[#fafaff] to-[#f0fdfa]">
        {state && (
          <div
            className={
              'absolute right-2.5 top-2.5 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border ' +
              CHIP_CHECK[state]
            }
          >
            <Check size={14} strokeWidth={3} />
          </div>
        )}
        <div className="absolute inset-x-0 top-2 bottom-2 flex items-end justify-center">
          <ThumbnailRender toy={editorToy} scaleFactor={1} style={silhouetteStyle} />
        </div>
      </div>
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              {toy.brand}
            </div>
            <div className="truncate text-sm font-semibold text-neutral-900">{toy.name}</div>
          </div>
          {toy.size && (
            <Chip size="sm" color="accent" className="shrink-0">
              <Chip.Label>{toy.size}</Chip.Label>
            </Chip>
          )}
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-1 rounded-lg bg-neutral-100 p-1">
          {STATE_ORDER.map((s) => {
            const active = s === state;
            return (
              <button
                key={s}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePick(s);
                }}
                className={
                  'h-11 rounded-md text-xs font-medium transition-colors ' +
                  (active ? SEG_ACTIVE[s] : 'text-neutral-500 hover:bg-white/60 hover:text-neutral-900')
                }
              >
                {INVOLVEMENT_LABEL[s]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
