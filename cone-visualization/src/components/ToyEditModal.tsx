'use client';

import { useMemo, useState } from 'react';
import { ToyEditor, useToyStore } from 'cone-editor';
import type { StyleOption, Toy as EditorToy } from 'cone-editor';
import { Alert, Button, ColorSwatchPicker, Modal, useOverlayState } from '@heroui/react';
import TextInput from './TextInput';
import { ArrowLeft } from 'lucide-react';
import { createToy, patchToy } from '../services/api';
import { SectionShape, type Toy, type ToyPayload } from '../services/types';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useUnit } from '../providers/UnitProvider';
import { circumferenceToDiameter, diameterToCircumference } from '../services/units';

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
            insertableLengthMm: source.insertableLength ?? null,
            knownTotalMm: source.totalLength ?? null,
            knownSizeMm: circumferenceToDiameter(source.circumference),
          }
        : NEW_TOY_MM,
    [source],
  );

  const [brand, setBrand] = useState(source?.brand ?? '');
  const [name, setName] = useState(source?.name ?? '');
  const [size, setSize] = useState(source?.size ?? '');
  const [color, setColor] = useState(source?.color || DEFAULT_FILL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runAction = useAsyncAction(setError);

  const sections = useToyStore((s) => s.sections);
  const topShape = useToyStore((s) => s.topShape);
  const bottomShape = useToyStore((s) => s.bottomShape);
  const insertableLengthMm = useToyStore((s) => s.insertableLengthMm);
  const knownTotalMm = useToyStore((s) => s.knownTotalMm);
  const knownSizeMm = useToyStore((s) => s.knownSizeMm);

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
    const payload: ToyPayload = {
      brand: brand.trim(),
      name: name.trim(),
      size: size.trim(),
      color,
      insertableLength: insertableLengthMm,
      totalLength: knownTotalMm,
      circumference: diameterToCircumference(knownSizeMm),
      shape: {
        topSectionShape: topShape,
        bottomSectionShape: bottomShape,
        sections: sections.map(({ id: _id, touched: _touched, ...s }, idx) => ({
          ...s,
          order: idx,
          circumference: s.circumference ?? null,
        })),
      },
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
              <Button variant="primary" size="sm" isDisabled={saving} onPress={handleSave}>
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
                initialToy={initial}
                style={style}
                unit={unit}
                leadingSlot={
                  <IdentificationGroup
                    brand={brand}
                    name={name}
                    size={size}
                    color={color}
                    onBrand={setBrand}
                    onName={setName}
                    onSize={setSize}
                    onColor={setColor}
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
  onBrand: (v: string) => void;
  onName: (v: string) => void;
  onSize: (v: string) => void;
  onColor: (v: string) => void;
};

function IdentificationGroup({
  brand,
  name,
  size,
  color,
  onBrand,
  onName,
  onSize,
  onColor,
}: IdentificationProps) {
  return (
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
        aria-label="Custom color"
        className={`relative inline-flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white ring-1 transition-transform hover:scale-110 ${isPreset ? 'ring-neutral-200' : 'ring-2 ring-blue-500'
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
          aria-label="Custom color"
        />
      </label>
    </div>
  );
}
