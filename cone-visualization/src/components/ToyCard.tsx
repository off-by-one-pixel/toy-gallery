'use client'

import { Render } from "cone-editor";
import type { Toy as EditorToy } from "cone-editor";
import { useUnit } from "../providers/UnitProvider";
import { formatDim, type Dimension } from "../services/units";
import type { Toy } from "./ConeList";

type Props = {
  toy: Toy;
  heightRatio: number;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  onEdit: (toy: Toy) => void;
  onDelete: (toy: Toy) => void;
};

const DEFAULT_FILL = "#c7e4ee";

export default function ToyCard({
  toy,
  heightRatio,
  detailsOpen,
  onToggleDetails,
  onEdit,
  onDelete,
}: Props) {
  const { unit } = useUnit();

  const style = {
    borderWidth: 1.25,
    borderColor: "#1f2937",
    color: toy.color || DEFAULT_FILL,
  };

  const editorToy: EditorToy = {
    sections: toy.sections,
    topShape: toy.topShape,
    bottomShape: toy.bottomShape,
  };

  return (
    <article
      className={
        "group relative bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer " +
        (detailsOpen
          ? "z-10 rounded-t-2xl rounded-b-none"
          : "z-0 rounded-2xl")
      }
      onClick={onToggleDetails}
    >
      <div className="relative h-60 overflow-hidden rounded-t-2xl border-b border-neutral-200 bg-linear-to-br from-[#fafaff] to-[#f0fdfa]">
        <div className="absolute top-2.5 right-2.5 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(toy); }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-white/90 text-neutral-800 backdrop-blur hover:bg-white hover:border-neutral-300"
            aria-label="Edit"
            title="Edit"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(toy); }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-white/90 text-neutral-800 backdrop-blur hover:bg-red-50 hover:border-red-200 hover:text-red-700"
            aria-label="Delete"
            title="Delete"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center" style={{ top: `${(1 - heightRatio) * 100}%` }}>
          <Render toy={editorToy} scaleFactor={1} style={style} />
        </div>
      </div>
      <div className="px-3.5 py-3">
        <div className="mb-2 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500 truncate">{toy.brand}</div>
            <div className="truncate text-sm font-semibold text-neutral-900">{toy.name}</div>
          </div>
          {toy.size && (
            <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-indigo-800">
              {toy.size}
            </span>
          )}
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-neutral-200 pt-2.5">
          <Metric label="Insertable" value={toy.insertableLength} unit={unit} />
          <Metric label="Circumference" value={toy.circumference} unit={unit} bordered />
        </div>
      </div>

      <div
        className={
          "absolute left-0 right-0 top-[calc(100%-14px)] z-20 flex flex-col gap-1 overflow-hidden rounded-b-2xl bg-white px-4 pb-3.5 pt-4 shadow-md transition-all duration-200 " +
          (detailsOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-2 opacity-0 pointer-events-none")
        }
        onClick={(e) => e.stopPropagation()}
      >
        <AttrRow label="Length" value={`${formatDim(toy.height, unit)} ${unit}`} />
        <AttrRow label="Diameter" value={`${formatDim(toy.diameter, unit)} ${unit}`} />
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
  value: Dimension | null;
  unit: "mm" | "in";
  bordered?: boolean;
}) {
  return (
    <div className={bordered ? "pl-3 border-l border-neutral-200" : ""}>
      <div className="text-[22px] font-semibold leading-none tracking-tight text-neutral-900 tabular-nums">
        {formatDim(value, unit)}
        {value != null && (
          <span className="ml-0.5 text-xs font-medium text-neutral-500">{unit}</span>
        )}
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
