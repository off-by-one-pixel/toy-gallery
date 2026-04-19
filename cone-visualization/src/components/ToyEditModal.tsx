'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ToyEditor, useToyStore } from 'cone-editor';
import type { StyleOption, Toy as EditorToy, ToySection } from 'cone-editor';
import { Alert, Button, ColorSwatchPicker, Input, Modal, NumberField, useOverlayState } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
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

  const initial = useMemo<EditorToy>(
    () => ({ ...seedMm, sections: convertSections(seedMm.sections, Unit.mm, unit) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seedMm],
  );

  const [brand, setBrand] = useState(isEdit ? mode.toy.brand : '');
  const [name, setName] = useState(isEdit ? mode.toy.name : '');
  const [size, setSize] = useState(isEdit ? mode.toy.size : '');
  const [color, setColor] = useState(isEdit ? mode.toy.color || DEFAULT_FILL : DEFAULT_FILL);
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

  // On unit flip, convert current store values in place so in-flight edits survive.
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

  // Widest-diameter section owns the toy-level circumference value; ties go
  // to the first in document order.
  const handleToyCircumferenceMmChange = (mm: number | null) => {
    if (sections.length === 0) return;
    const widest = sections.reduce((a, s) => (s.diameter > a.diameter ? s : a));
    const valueInUnit = mm == null ? null : fromMm(mm, unit);
    setCircumference(widest.id, valueInUnit);
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

  const totalHeightMm = toMm(getTotalHeight(), unit);
  const maxDiameterMm = toMm(getMaxWidth(), unit);

  return (
    <Modal.Root state={overlayState}>
      <Modal.Backdrop>
        <Modal.Container size="full" placement="center">
          <Modal.Dialog className="flex flex-col overflow-hidden">
            <header className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2.5">
              <Button
                variant="outline"
                size="sm"
                isIconOnly
                aria-label="Back"
                onPress={() => overlayState.close()}
              >
                <ArrowLeft size={14} strokeWidth={2} />
              </Button>
              <h2 className="text-sm font-semibold tracking-tight text-neutral-900">
                {isEdit ? 'Edit' : 'New toy'}
                <span className="ml-2 font-normal text-neutral-500">{title}</span>
              </h2>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                isDisabled={saving}
                onPress={() => overlayState.close()}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isDisabled={saving || !hasCircumference}
                onPress={handleSave}
              >
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
        <h2 className="m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          Identification
        </h2>
        <FormField label="Brand">
          <Input value={brand} onChange={(e) => onBrand(e.target.value)} aria-label="Brand" />
        </FormField>
        <FormField label="Model">
          <Input value={name} onChange={(e) => onName(e.target.value)} aria-label="Model" />
        </FormField>
        <FormField label="Size">
          <Input value={size} onChange={(e) => onSize(e.target.value)} aria-label="Size" />
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
  const step = unit === Unit.in ? 0.01 : 1;
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
        {label} <span className="normal-case text-neutral-500">({unit})</span>
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
      <ColorSwatchPicker
        value={value}
        onChange={(c) => onChange(c.toString('hex'))}
        aria-label="Preset colors"
      >
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
