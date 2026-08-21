'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import TextInput from '@/components/TextInput';
import ColorPicker from '@/features/toys/editor/ColorPicker';
import type { ToyEditForm } from '@/features/toys/editor/useToyEditForm';

type Props = Readonly<{
  form: ToyEditForm;
}>;

export default function IdentificationGroup({ form }: Props) {
  const t = useTranslations('toyEdit');
  const common = useTranslations('common');
  const { identity, setIdentityField } = form;
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="m-0 text-caption font-semibold uppercase tracking-[0.08em] text-text-tertiary">
        {t('identification')}
      </h2>
      <FormField label={t('brand')}>
        <TextInput
          size="sm"
          value={identity.brand}
          onChange={(v) => setIdentityField('brand', v)}
          aria-label={t('brand')}
        />
      </FormField>
      <FormField label={t('model')}>
        <TextInput
          size="sm"
          value={identity.name}
          onChange={(v) => setIdentityField('name', v)}
          aria-label={t('model')}
        />
      </FormField>
      <FormField label={common('size')}>
        <TextInput
          size="sm"
          value={identity.size}
          onChange={(v) => setIdentityField('size', v)}
          aria-label={common('size')}
        />
      </FormField>
      <FormField label={common('color')}>
        <ColorPicker value={identity.color} onChange={(v) => setIdentityField('color', v)} />
      </FormField>
    </section>
  );
}

function FormField({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="grid grid-cols-[62px_1fr] items-center gap-2.5">
      <span className="text-caption uppercase tracking-wide text-muted">{label}</span>
      {children}
    </div>
  );
}
