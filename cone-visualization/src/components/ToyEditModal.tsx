'use client';

import { useMemo, useRef, useState } from 'react';
import { ToyEditor, useToyStore } from 'cone-editor';
import type { StyleOption, Toy as EditorToy } from 'cone-editor';
import { Alert, Button, ColorSwatchPicker, Modal, NumberField, useOverlayState } from '@heroui/react';
import TextInput from './TextInput';
import { ArrowLeft } from 'lucide-react';
import { createToy, patchToy } from '../services/api';
import { SectionShape, type Toy, type ToyPayload } from '../services/types';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useUnit } from '../providers/UnitProvider';
import { Unit, formatValue, fromMm, toMm } from '../services/units';

type Mode = { kind: 'new' } | { kind: 'edit'; toy: Toy } | { kind: 'copy'; toy: Toy };

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

const NEW_TOY_MM: EditorToy = {
  sections: [
    { id: 0, diameter: 90, height: 25, circumference: null },
    { id: 1, diameter: 55, height: 75, circumference: null },
    { id: 2, diameter: 65, height: 50, circumference: null },
  ],
  topShape: SectionShape.EGG,
  bottomShape: SectionShape.FLAT,
};

export default function ToyEditModal({ mode, onClose, onSaved }: Props) {
  const isEdit = mode.kind === 'edit';
  const source = mode.kind === 'new' ? null : mode.toy;
  const { unit } = useUnit();

  const initial = useMemo<EditorToy>(
    () =>
      source
        ? {
            sections: source.shape.sections.map((s) => ({ ...s })),
            topShape: source.shape.topSectionShape ?? SectionShape.FLAT,
            bottomShape: source.shape.bottomSectionShape ?? SectionShape.FLAT,
          }
        : NEW_TOY_MM,
    [source],
  );

  const [brand, setBrand] = useState(source?.brand ?? '');
  const [name, setName] = useState(source?.name ?? '');
  const [size, setSize] = useState(source?.size ?? '');
  const [color, setColor] = useState(source?.color || DEFAULT_FILL);
  const [insertableLengthMm, setInsertableLengthMm] = useState<number | null>(source?.insertableLength ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runAction = useAsyncAction(setError);

  const sections = useToyStore((s) => s.sections);
  const topShape = useToyStore((s) => s.topShape);
  const bottomShape = useToyStore((s) => s.bottomShape);
  const setCircumference = useToyStore((s) => s.setCircumference);
  const getTotalHeight = useToyStore((s) => s.getTotalHeight);
  const getMaxWidth = useToyStore((s) => s.getMaxWidth);

  const circumferenceValues = sections.map((s) => s.circumference).filter((v): v is number => v != null);
  const toyCircumferenceMm = circumferenceValues.length ? Math.max(...circumferenceValues) : null;
  const hasCircumference = toyCircumferenceMm != null;

  // Widest-diameter section owns the toy-level circumference value; ties go
  // to the first in document order.
  const handleToyCircumferenceMmChange = (mm: number | null) => {
    if (sections.length === 0) return;
    const widest = sections.reduce((a, s) => (s.diameter > a.diameter ? s : a));
    setCircumference(widest.id, mm);
  };

  const svgRef = useRef<SVGSVGElement>(null);

  const overlayState = useOverlayState({
    defaultOpen: true,
    onOpenChange: (isOpen) => {
      if (!isOpen) onClose();
    },
  });

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
    const payload: ToyPayload = {
      brand: brand.trim(),
      name: name.trim(),
      size: size.trim(),
      color,
      insertableLength: insertableLengthMm,
      shape: {
        topSectionShape: topShape,
        bottomSectionShape: bottomShape,
        sections: sections.map((s, idx) => ({
          order: idx,
          height: s.height,
          diameter: s.diameter,
          circumference: s.circumference ?? null,
        })),
      },
      // Carry over fields not exposed in this form so a copy is a faithful
      // duplicate, not a stripped-down version.
      ...(mode.kind === 'copy' && {
        datePurchased: mode.toy.datePurchased ?? null,
        retired: mode.toy.retired,
        customAttributes: mode.toy.customAttributes,
      }),
    };
    await runAction(
      async () => {
        if (mode.kind === 'edit') await patchToy(mode.toy.id, payload);
        else await createToy(payload);
      },
      {
        busy: setSaving,
        onSuccess: onSaved,
      },
    );
  };

  const headerLabel = mode.kind === 'edit' ? 'Edit' : mode.kind === 'copy' ? 'Copy' : 'New toy';
  const title = isEdit
    ? `${mode.toy.brand} · ${mode.toy.name}${mode.toy.size ? ` · ${mode.toy.size}` : ''}`
    : mode.kind === 'copy'
      ? `from ${mode.toy.brand} · ${mode.toy.name}`
      : 'Untitled toy';

  const totalHeightMm = getTotalHeight();
  const maxDiameterMm = getMaxWidth();

  return (
    <Modal.Root state={overlayState}>
      <Modal.Backdrop>
        <Modal.Container size="full" placement="center">
          <Modal.Dialog className="flex flex-col overflow-hidden">
            <header className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2.5">
              <Button variant="outline" size="sm" isIconOnly aria-label="Back" onPress={() => overlayState.close()}>
                <ArrowLeft size={14} strokeWidth={2} />
              </Button>
              <h2 className="text-sm font-semibold tracking-tight text-neutral-900">
                {headerLabel}
                <span className="ml-2 font-normal text-neutral-500">{title}</span>
              </h2>
              <div className="flex-1" />
              <Button variant="outline" size="sm" isDisabled={saving} onPress={() => overlayState.close()}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" isDisabled={saving || !hasCircumference} onPress={handleSave}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </header>

            {error && (
              <Alert status="danger" className="rounded-none">
                <Alert.Description>{error}</Alert.Description>
              </Alert>
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
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
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
        <h2 className="m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">Identification</h2>
        <FormField label="Brand">
          <TextInput size="sm" value={brand} onChange={onBrand} aria-label="Brand" />
        </FormField>
        <FormField label="Model">
          <TextInput size="sm" value={name} onChange={onName} aria-label="Model" />
        </FormField>
        <FormField label="Size">
          <TextInput size="sm" value={size} onChange={onSize} aria-label="Size" />
        </FormField>
        <FormField label="Color">
          <ColorPicker value={color} onChange={onColor} />
        </FormField>
      </section>

      <section className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-4">
          <DimInput label="Insertable" valueMm={insertableLengthMm} unit={unit} onChangeMm={onInsertableLengthMm} />
          <DimInput label="Circumference" valueMm={circumferenceMm} unit={unit} onChangeMm={onCircumferenceMm} />
        </div>
        <div className="flex items-center gap-3 border-t border-neutral-200 pt-2.5 text-[11px] uppercase tracking-wider text-neutral-400">
          <span>
            Length{' '}
            <b className="ml-1 font-semibold tabular-nums text-neutral-600 normal-case">
              {formatValue(totalHeightMm, unit)}
            </b>{' '}
            {unit.id}
          </span>
          <span className="opacity-40">·</span>
          <span>
            Diameter{' '}
            <b className="ml-1 font-semibold tabular-nums text-neutral-600 normal-case">
              {formatValue(maxDiameterMm, unit)}
            </b>{' '}
            {unit.id}
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
  const step = 10 ** -unit.decimals;
  const displayValue = valueMm == null ? NaN : fromMm(valueMm, unit);
  return (
    <div className="flex flex-col gap-1">
      <NumberField
        value={displayValue}
        step={step}
        minValue={0}
        onChange={(v) => onChangeMm(Number.isNaN(v) ? null : toMm(Math.max(0, v), unit))}
        aria-label={label}
      >
        <NumberField.Group>
          <NumberField.Input />
          <NumberField.DecrementButton>−</NumberField.DecrementButton>
          <NumberField.IncrementButton>+</NumberField.IncrementButton>
        </NumberField.Group>
      </NumberField>
      <span className="text-[10px] uppercase tracking-wider text-neutral-400">
        {label} <span className="normal-case text-neutral-500">({unit.id})</span>
      </span>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // `div`, not `label` — a wrapping label would bubble swatch clicks to the
    // hidden <input type="color"> in the Color row and open the native picker.
    <div className="grid grid-cols-[62px_1fr] items-center gap-2.5">
      <span className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</span>
      {children}
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isPreset = PRESET_COLORS.some((p) => p.hex.toLowerCase() === value.toLowerCase());
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ColorSwatchPicker value={value} onChange={(c) => onChange(c.toString('hex'))} aria-label="Preset colors">
        {PRESET_COLORS.map((p) => (
          <ColorSwatchPicker.Item key={p.hex} color={p.hex} aria-label={p.name}>
            <ColorSwatchPicker.Swatch />
            <ColorSwatchPicker.Indicator />
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>
      <label
        className={`relative inline-flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white ring-1 transition-transform hover:scale-110 ${
          isPreset ? 'ring-neutral-200' : 'ring-2 ring-blue-500'
        }`}
        style={{
          background: isPreset
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
