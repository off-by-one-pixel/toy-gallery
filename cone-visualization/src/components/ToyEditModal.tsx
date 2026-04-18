'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ToyEditor, useToyStore } from 'cone-editor';
import type { StyleOption, Toy as EditorToy, ToySection } from 'cone-editor';
import { createToy, replaceToy, type Toy } from '../services/api';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useUnit } from '../providers/UnitProvider';
import { Unit, convertSections, fromMm, toMm } from '../services/units';

type Mode =
  | { kind: 'new' }
  | { kind: 'edit'; toy: Toy };

type Props = {
  mode: Mode;
  onClose: () => void;
  onSaved: () => void;
};

const PRESET_COLORS: { name: string; hex: string }[] = [
  { name: 'Purple', hex: '#c4b5fd' },
  { name: 'Slate', hex: '#475569' },
  { name: 'Blue', hex: '#bae6fd' },
  { name: 'Red', hex: '#fca5a5' },
  { name: 'Green', hex: '#bbf7d0' },
];

const DEFAULT_FILL = '#c4b5fd';

// NEW_TOY sections are mm values; they get converted to the active unit on hydrate.
const NEW_TOY_MM: EditorToy = {
  sections: [
    { id: 0, diameter: 90, height: 25, circumference: null },
    { id: 1, diameter: 55, height: 75, circumference: null },
    { id: 2, diameter: 65, height: 50, circumference: null },
  ],
  topShape: 'egg',
  bottomShape: 'flat',
};

const maxCircumferenceMm = (sections: ToySection[], unit: Unit): number | null => {
  const values = sections
    .map((s) => s.circumference)
    .filter((v): v is number => v != null);
  if (!values.length) return null;
  return toMm(Math.max(...values), unit);
};

const formatInUnit = (mm: number | null | undefined, unit: Unit): string => {
  if (mm == null) return '—';
  const v = fromMm(mm, unit);
  return unit === Unit.in ? v.toFixed(2) : String(Math.round(v));
};

export default function ToyEditModal({ mode, onClose, onSaved }: Props) {
  const isEdit = mode.kind === 'edit';
  const { unit } = useUnit();

  // Snapshot the seed in mm; the hydrate step below re-scales to the active unit.
  const seedMm = useMemo<EditorToy>(
    () =>
      mode.kind === 'edit'
        ? {
            sections: mode.toy.sections.map((s) => ({ ...s })),
            topShape: mode.toy.topShape,
            bottomShape: mode.toy.bottomShape,
          }
        : NEW_TOY_MM,
    [mode],
  );

  // Initial hydrate uses the active unit at mount.
  const initial = useMemo<EditorToy>(
    () => ({ ...seedMm, sections: convertSections(seedMm.sections, Unit.mm, unit) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seedMm],
  );

  const [brand, setBrand] = useState(isEdit ? mode.toy.brand : '');
  const [name, setName] = useState(isEdit ? mode.toy.name : '');
  const [size, setSize] = useState(isEdit ? mode.toy.size : '');
  const [color, setColor] = useState(isEdit ? mode.toy.color || DEFAULT_FILL : DEFAULT_FILL);
  // Always store insertableLength internally in mm.
  const [insertableLengthMm, setInsertableLengthMm] = useState<number | null>(
    isEdit ? (mode.toy.insertableLength?.mm ?? null) : null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runAction = useAsyncAction(setError);

  const sections = useToyStore((s) => s.sections);
  const topShape = useToyStore((s) => s.topShape);
  const hydrate = useToyStore((s) => s.hydrate);
  const setCircumference = useToyStore((s) => s.setCircumference);
  const getTotalHeight = useToyStore((s) => s.getTotalHeight);
  const getMaxWidth = useToyStore((s) => s.getMaxWidth);

  // When the global unit flips while the modal is open, convert the current
  // store values (preserving in-flight edits).
  const prevUnit = useRef<Unit>(unit);
  useEffect(() => {
    if (prevUnit.current === unit) return;
    const converted = convertSections(sections, prevUnit.current, unit);
    hydrate({ sections: converted, topShape, bottomShape: 'flat' });
    prevUnit.current = unit;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit]);

  const toyCircumferenceMm = maxCircumferenceMm(sections, unit);
  const hasCircumference = toyCircumferenceMm != null;

  // Writing at the toy level targets the widest-diameter section. Ties go to
  // the first section in document order (reduce keeps the accumulator unless
  // the next candidate is strictly wider).
  const handleToyCircumferenceMmChange = (mm: number | null) => {
    if (sections.length === 0) return;
    const widest = sections.reduce((a, s) => (s.diameter > a.diameter ? s : a));
    const valueInUnit = mm == null ? null : fromMm(mm, unit);
    setCircumference(widest.id, valueInUnit);
  };

  // For the silhouette in the editor canvas, always feed mm sections; the
  // editor's store holds active-unit values used only by the section inputs.
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const style: StyleOption = {
    borderWidth: 2,
    borderColor: '#1f2937',
    color,
  };

  const handleSave = async () => {
    setError(null);
    if (!brand.trim() || !name.trim()) {
      setError('Brand and name are required.');
      return;
    }
    if (sections.length === 0) {
      setError('At least one section is required.');
      return;
    }
    if (!hasCircumference) {
      setError('Set a circumference on at least one section.');
      return;
    }
    const sectionsMm = convertSections(sections, unit, Unit.mm);
    const payload = {
      brand: brand.trim(),
      name: name.trim(),
      size: size.trim(),
      color,
      insertableLength: insertableLengthMm,
      topShape,
      sections: sectionsMm,
    };
    await runAction(
      () =>
        mode.kind === 'edit'
          ? replaceToy(mode.toy.id, payload)
          : createToy(payload),
      { busy: setSaving, onSuccess: onSaved },
    );
  };

  const title = isEdit
    ? `${mode.toy.brand} · ${mode.toy.name}${mode.toy.size ? ` · ${mode.toy.size}` : ''}`
    : 'Untitled toy';

  // Convert store totals back to mm for the shared readout path.
  const totalHeightMm = toMm(getTotalHeight(), unit);
  const maxDiameterMm = toMm(getMaxWidth(), unit);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-neutral-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-6 top-6 bottom-6 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100 hover:border-neutral-300"
            title="Back"
            aria-label="Back"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5m0 0 7 7m-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-sm font-semibold tracking-tight text-neutral-900">
            {isEdit ? 'Edit' : 'New toy'}
            <span className="ml-2 font-normal text-neutral-500">{title}</span>
          </h2>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-200 bg-white px-3 pt-1.75 pb-1.25 text-sm font-medium text-neutral-900 hover:bg-neutral-100 hover:border-neutral-300"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasCircumference}
            title={!hasCircumference ? 'Set a circumference on at least one section' : undefined}
            className="rounded-md bg-blue-600 px-3 pt-1.75 pb-1.25 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </header>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0">
          <ToyEditor
            ref={svgRef}
            initialToy={initial}
            style={style}
            unit={unit}
            leadingSlot={
              <IdentificationGroup
                brand={brand}
                name={name}
                size={size}
                color={color}
                insertableLengthMm={insertableLengthMm}
                circumferenceMm={toyCircumferenceMm}
                unit={unit}
                onBrand={setBrand}
                onName={setName}
                onSize={setSize}
                onColor={setColor}
                onInsertableLengthMm={setInsertableLengthMm}
                onCircumferenceMm={handleToyCircumferenceMmChange}
                totalHeightMm={totalHeightMm}
                maxDiameterMm={maxDiameterMm}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}

type IdentificationProps = {
  brand: string;
  name: string;
  size: string;
  color: string;
  insertableLengthMm: number | null;
  circumferenceMm: number | null;
  unit: Unit;
  onBrand: (v: string) => void;
  onName: (v: string) => void;
  onSize: (v: string) => void;
  onColor: (v: string) => void;
  onInsertableLengthMm: (v: number | null) => void;
  onCircumferenceMm: (v: number | null) => void;
  totalHeightMm: number;
  maxDiameterMm: number;
};

function IdentificationGroup({
  brand,
  name,
  size,
  color,
  insertableLengthMm,
  circumferenceMm,
  unit,
  onBrand,
  onName,
  onSize,
  onColor,
  onInsertableLengthMm,
  onCircumferenceMm,
  totalHeightMm,
  maxDiameterMm,
}: IdentificationProps) {
  return (
    <>
      <section className="flex flex-col gap-2.5">
        <h2 className="m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          Identification
        </h2>
        <FormField label="Brand">
          <input
            type="text"
            value={brand}
            onChange={(e) => onBrand(e.target.value)}
            className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15"
          />
        </FormField>
        <FormField label="Model">
          <input
            type="text"
            value={name}
            onChange={(e) => onName(e.target.value)}
            className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15"
          />
        </FormField>
        <FormField label="Size">
          <input
            type="text"
            value={size}
            onChange={(e) => onSize(e.target.value)}
            className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15"
          />
        </FormField>
        <FormField label="Color">
          <ColorPicker value={color} onChange={onColor} />
        </FormField>
      </section>

      <section className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-4">
          <DimInput
            label="Insertable"
            valueMm={insertableLengthMm}
            unit={unit}
            onChangeMm={onInsertableLengthMm}
          />
          <DimInput
            label="Circumference"
            valueMm={circumferenceMm}
            unit={unit}
            onChangeMm={onCircumferenceMm}
          />
        </div>
        <div className="flex items-center gap-3 border-t border-neutral-200 pt-2.5 text-[11px] uppercase tracking-wider text-neutral-400">
          <span>
            Length{' '}
            <b className="ml-1 font-semibold tabular-nums text-neutral-600 normal-case">
              {formatInUnit(totalHeightMm, unit)}
            </b>{' '}
            {unit}
          </span>
          <span className="opacity-40">·</span>
          <span>
            Diameter{' '}
            <b className="ml-1 font-semibold tabular-nums text-neutral-600 normal-case">
              {formatInUnit(maxDiameterMm, unit)}
            </b>{' '}
            {unit}
          </span>
        </div>
      </section>
    </>
  );
}

function DimInput({
  label,
  valueMm,
  unit,
  onChangeMm,
}: {
  label: string;
  valueMm: number | null;
  unit: Unit;
  onChangeMm: (v: number | null) => void;
}) {
  const step = unit === Unit.in ? 0.1 : 1;
  const display =
    valueMm == null
      ? ''
      : unit === Unit.in
      ? fromMm(valueMm, unit).toFixed(2)
      : String(Math.round(fromMm(valueMm, unit)));
  return (
    <label className="flex flex-col gap-1">
      <span className="inline-flex items-baseline gap-1">
        <input
          type="number"
          min={0}
          step={step}
          value={display}
          placeholder="—"
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') return onChangeMm(null);
            const v = Math.max(0, Number(raw));
            onChangeMm(toMm(v, unit));
          }}
          className="w-20 border-0 border-b border-transparent bg-transparent p-0 text-2xl font-semibold tracking-tight tabular-nums text-neutral-900 outline-none focus:border-blue-500"
        />
        <span className="text-xs font-medium text-neutral-500">{unit}</span>
      </span>
      <span className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</span>
    </label>
  );
}


function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid grid-cols-[62px_1fr] items-center gap-2.5">
      <span className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const presetMatch = PRESET_COLORS.find((p) => p.hex.toLowerCase() === value.toLowerCase());
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESET_COLORS.map((p) => {
        const selected = presetMatch?.hex === p.hex;
        return (
          <button
            key={p.hex}
            type="button"
            onClick={() => onChange(p.hex)}
            title={p.name}
            className={`h-6 w-6 rounded-full border-2 border-white ring-1 transition-transform hover:scale-110 ${
              selected ? 'ring-2 ring-blue-500' : 'ring-neutral-200'
            }`}
            style={{ background: p.hex }}
          />
        );
      })}
      <label
        className={`relative inline-flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white ring-1 transition-transform hover:scale-110 ${
          !presetMatch ? 'ring-2 ring-blue-500' : 'ring-neutral-200'
        }`}
        style={{
          background: presetMatch
            ? 'conic-gradient(from 0deg, #fca5a5, #fbbf24, #bbf7d0, #bae6fd, #c4b5fd, #fca5a5)'
            : value,
        }}
        title="Custom color"
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer border-0 p-0 opacity-0"
        />
      </label>
    </div>
  );
}
