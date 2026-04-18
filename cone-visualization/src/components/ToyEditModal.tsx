'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ToyEditor, useToyStore } from 'cone-editor';
import type { StyleOption, Toy as EditorToy } from 'cone-editor';
import { createToy, replaceToy } from '../services/api';
import type { Toy } from './ConeList';

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

const NEW_TOY: EditorToy = {
  sections: [
    { id: 0, diameter: 90, height: 25, circumference: null },
    { id: 1, diameter: 55, height: 75, circumference: null },
    { id: 2, diameter: 65, height: 50, circumference: null },
  ],
  topShape: 'egg',
  bottomShape: 'flat',
};

const maxCircumference = (sections: { circumference?: number | null }[]): number | null => {
  const values = sections
    .map((s) => s.circumference)
    .filter((v): v is number => v != null);
  return values.length ? Math.max(...values) : null;
};

export default function ToyEditModal({ mode, onClose, onSaved }: Props) {
  const isEdit = mode.kind === 'edit';
  const initial = useMemo<EditorToy>(
    () =>
      mode.kind === 'edit'
        ? {
            sections: mode.toy.sections.map((s) => ({ ...s })),
            topShape: mode.toy.topShape,
            bottomShape: mode.toy.bottomShape,
          }
        : NEW_TOY,
    [mode],
  );

  const [brand, setBrand] = useState(isEdit ? mode.toy.brand : '');
  const [name, setName] = useState(isEdit ? mode.toy.name : '');
  const [size, setSize] = useState(isEdit ? mode.toy.size : '');
  const [color, setColor] = useState(isEdit ? mode.toy.color || DEFAULT_FILL : DEFAULT_FILL);
  const [insertableLength, setInsertableLength] = useState<number | null>(
    isEdit ? mode.toy.insertableLength : null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sections = useToyStore((s) => s.sections);
  const topShape = useToyStore((s) => s.topShape);
  const getTotalHeight = useToyStore((s) => s.getTotalHeight);
  const getMaxWidth = useToyStore((s) => s.getMaxWidth);

  const toyCircumference = maxCircumference(sections);
  const hasCircumference = toyCircumference != null;

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
    setSaving(true);
    try {
      const payload = {
        brand: brand.trim(),
        name: name.trim(),
        size: size.trim(),
        color,
        insertableLength,
        topShape,
        sections,
      };
      if (mode.kind === 'edit') {
        await replaceToy(mode.toy.id, payload);
      } else {
        await createToy(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  };

  const title = isEdit
    ? `${mode.toy.brand} · ${mode.toy.name}${mode.toy.size ? ` · ${mode.toy.size}` : ''}`
    : 'Untitled toy';

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
            leadingSlot={
              <IdentificationGroup
                brand={brand}
                name={name}
                size={size}
                color={color}
                insertableLength={insertableLength}
                circumference={toyCircumference}
                onBrand={setBrand}
                onName={setName}
                onSize={setSize}
                onColor={setColor}
                onInsertableLength={setInsertableLength}
                totalHeight={Math.round(getTotalHeight())}
                maxDiameter={Math.round(getMaxWidth())}
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
  insertableLength: number | null;
  circumference: number | null;
  onBrand: (v: string) => void;
  onName: (v: string) => void;
  onSize: (v: string) => void;
  onColor: (v: string) => void;
  onInsertableLength: (v: number | null) => void;
  totalHeight: number;
  maxDiameter: number;
};

function IdentificationGroup({
  brand,
  name,
  size,
  color,
  insertableLength,
  circumference,
  onBrand,
  onName,
  onSize,
  onColor,
  onInsertableLength,
  totalHeight,
  maxDiameter,
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
            value={insertableLength}
            onChange={onInsertableLength}
          />
          <DimReadout
            label="Circumference"
            value={circumference}
            hint={circumference == null ? 'Set per section' : undefined}
          />
        </div>
        <div className="flex items-center gap-3 border-t border-neutral-200 pt-2.5 text-[11px] uppercase tracking-wider text-neutral-400">
          <span>Length <b className="ml-1 font-semibold tabular-nums text-neutral-600 normal-case">{totalHeight}</b> mm</span>
          <span className="opacity-40">·</span>
          <span>Diameter <b className="ml-1 font-semibold tabular-nums text-neutral-600 normal-case">{maxDiameter}</b> mm</span>
        </div>
      </section>
    </>
  );
}

function DimInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="inline-flex items-baseline gap-1">
        <input
          type="number"
          min={0}
          value={value ?? ''}
          placeholder="—"
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === '' ? null : Math.max(0, Number(raw)));
          }}
          className="w-20 border-0 border-b border-transparent bg-transparent p-0 text-2xl font-semibold tracking-tight tabular-nums text-neutral-900 outline-none focus:border-blue-500"
        />
        <span className="text-xs font-medium text-neutral-500">mm</span>
      </span>
      <span className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</span>
    </label>
  );
}

function DimReadout({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | null;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight tabular-nums text-neutral-900">
          {value == null ? '—' : Math.round(value)}
        </span>
        <span className="text-xs font-medium text-neutral-500">mm</span>
      </span>
      <span className="text-[10px] uppercase tracking-wider text-neutral-400">
        {label}
        {hint && <span className="ml-1 normal-case text-neutral-400/80">({hint})</span>}
      </span>
    </div>
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
