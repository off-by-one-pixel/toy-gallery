'use client';

import type { ReactNode } from 'react';

import TextInput from '../TextInput';
import ColorPicker from './ColorPicker';
import type { ToyEditForm } from './useToyEditForm';

type Props = Readonly<{
  form: ToyEditForm;
}>;

export default function IdentificationGroup({ form }: Props) {
  const { identity, setIdentityField } = form;
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">Identification</h2>
      <FormField label="Brand">
        <TextInput size="sm" value={identity.brand} onChange={(v) => setIdentityField('brand', v)} aria-label="Brand" />
      </FormField>
      <FormField label="Model">
        <TextInput size="sm" value={identity.name} onChange={(v) => setIdentityField('name', v)} aria-label="Model" />
      </FormField>
      <FormField label="Size">
        <TextInput size="sm" value={identity.size} onChange={(v) => setIdentityField('size', v)} aria-label="Size" />
      </FormField>
      <FormField label="Color">
        <ColorPicker value={identity.color} onChange={(v) => setIdentityField('color', v)} />
      </FormField>
    </section>
  );
}

function FormField({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    // `div`, not `label` — a wrapping label would bubble swatch clicks to the
    // hidden <input type="color"> in the Color row and open the native picker.
    <div className="grid grid-cols-[62px_1fr] items-center gap-2.5">
      <span className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</span>
      {children}
    </div>
  );
}
