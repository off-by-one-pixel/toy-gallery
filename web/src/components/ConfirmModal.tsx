'use client';

import { Button, Modal, useOverlayState } from '@heroui/react';
import { useTranslations } from 'next-intl';

type Props = Readonly<{
  onClose: () => void;
  title: string;
  body: string;
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

  const overlayState = useOverlayState({
    defaultOpen: true,
    onOpenChange: (isOpen) => {
      if (!isOpen) onClose();
    },
  });

  return (
    <Modal.Root state={overlayState}>
      <Modal.Backdrop>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <div className="flex flex-col gap-4 p-5">
              <header>
                <h2 className="text-base font-semibold tracking-tight text-neutral-900">{title}</h2>
                <p className="mt-1 text-[13px] text-neutral-500">{body}</p>
              </header>
              <div className="mt-1 flex justify-end gap-2">
                <Button variant="outline" size="sm" isDisabled={busy} onPress={() => overlayState.close()}>
                  {common('cancel')}
                </Button>
                <Button variant={confirmVariant} size="sm" isDisabled={busy} onPress={onConfirm}>
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
