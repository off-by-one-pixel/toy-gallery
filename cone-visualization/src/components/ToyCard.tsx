'use client';

import { Button, Chip } from '@heroui/react';
import { Render } from 'cone-editor';
import type { Toy as EditorToy } from 'cone-editor';
import { Pencil, Trash2 } from 'lucide-react';
import { useUnit } from '../providers/UnitProvider';
import { formatValue, type Unit } from '../services/units';
import { SectionShape, type Toy } from '../services/types';
import AttributesPanel from './AttributesPanel';

type Props = {
  toy: Toy;
  heightRatio: number;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  onEdit: (toy: Toy) => void;
  onDelete: (toy: Toy) => void;
};

const DEFAULT_FILL = '#c7e4ee';

export default function ToyCard({ toy, heightRatio, detailsOpen, onToggleDetails, onEdit, onDelete }: Props) {
  const { unit } = useUnit();

  const style = {
    borderWidth: 1.25,
    borderColor: '#1f2937',
    color: toy.color || DEFAULT_FILL,
  };

  const editorToy: EditorToy = {
    sections: toy.shape.sections,
    topShape: toy.shape.topSectionShape ?? SectionShape.FLAT,
    bottomShape: toy.shape.bottomSectionShape ?? SectionShape.FLAT,
  };

  return (
    <article
      className={
        'group relative bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer ' +
        (detailsOpen ? 'z-10 rounded-t-2xl rounded-b-none' : 'z-0 rounded-2xl')
      }
      onClick={onToggleDetails}
    >
      <div className="relative h-60 overflow-hidden rounded-t-2xl border-b border-neutral-200 bg-linear-to-br from-[#fafaff] to-[#f0fdfa]">
        <div className="absolute top-2.5 right-2.5 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="outline"
            size="sm"
            isIconOnly
            aria-label="Edit"
            onPress={() => onEdit(toy)}
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil size={13} strokeWidth={1.8} />
          </Button>
          <Button
            variant="danger-soft"
            size="sm"
            isIconOnly
            aria-label="Delete"
            onPress={() => onDelete(toy)}
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 size={13} strokeWidth={1.8} />
          </Button>
        </div>
        <div
          className="absolute inset-x-0 flex items-end justify-center"
          style={{
            top: `calc(${(1 - heightRatio) * 100}% - ${(1 - heightRatio) * 8}px)`,
            bottom: '8px',
          }}
        >
          <Render toy={editorToy} scaleFactor={1} style={style} interactive={false} />
        </div>
      </div>
      <div className="px-3.5 py-3">
        <div className="mb-2 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 truncate">
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
        <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-neutral-200 pt-2.5">
          <Metric label="Insertable" value={toy.insertableLength} unit={unit} />
          <Metric label="Circumference" value={toy.circumference} unit={unit} bordered />
        </div>
      </div>

      <div
        className={
          'absolute left-0 right-0 top-[calc(100%-14px)] z-20 flex flex-col gap-1 overflow-hidden rounded-b-2xl bg-white px-4 pb-3.5 pt-4 shadow-md transition-all duration-200 ' +
          (detailsOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-2 opacity-0 pointer-events-none')
        }
        onClick={(e) => e.stopPropagation()}
      >
        <AttrRow label="Length" value={`${formatValue(toy.height, unit)} ${unit.id}`} />
        <AttrRow label="Diameter" value={`${formatValue(toy.diameter, unit)} ${unit.id}`} />
        <div className="mt-2 border-t border-neutral-200 pt-2.5">
          <AttributesPanel toy={toy} />
        </div>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  unit,
  bordered,
}: {
  label: string;
  value: number | null | undefined;
  unit: Unit;
  bordered?: boolean;
}) {
  return (
    <div className={bordered ? 'pl-3 border-l border-neutral-200' : ''}>
      <div className="text-[22px] font-semibold leading-none tracking-tight text-neutral-900 tabular-nums">
        {formatValue(value, unit)}
        {value != null && <span className="ml-0.5 text-xs font-medium text-neutral-500">{unit.id}</span>}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-neutral-400">{label}</div>
    </div>
  );
}

function AttrRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center gap-3">
      <span className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</span>
      <span className="text-sm tabular-nums text-neutral-900">{value}</span>
    </div>
  );
}
