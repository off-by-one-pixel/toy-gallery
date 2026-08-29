'use client';

import { Button } from '@heroui/react';

import AppModal from '@/components/AppModal';
import { useTranslations } from 'next-intl';

import SectionHeading from '@/components/SectionHeading';

type Props = Readonly<{
  onClose: () => void;
  title: string;
  body?: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
}>;

export default function ConfirmModal({
  onClose,
  title,
  body,
  confirmLabel,
  confirmVariant = 'primary',
  busy = false,
  onConfirm,
}: Props) {
  const common = useTranslations('common');

  return (
    <AppModal label={title} onClose={onClose}>
      <div className="flex flex-col gap-4 p-5">
        <SectionHeading title={title} subtitle={body} />
        <div className="mt-1 flex justify-end gap-2">
          <Button variant="outline" size="sm" isDisabled={busy} onPress={onClose}>
            {common('cancel')}
          </Button>
          <Button variant={confirmVariant} size="sm" isDisabled={busy} onPress={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </AppModal>
  );
}
