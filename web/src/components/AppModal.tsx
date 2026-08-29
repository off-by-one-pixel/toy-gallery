'use client';

import type { ComponentProps, ReactNode } from 'react';

import { Modal } from '@heroui/react';

type Props = Readonly<{
  label: string;
  onClose: () => void;
  size?: ComponentProps<typeof Modal.Container>['size'];
  className?: string;
  children: ReactNode;
}>;

export default function AppModal({ label, onClose, size = 'sm', className, children }: Props) {
  return (
    <Modal.Backdrop
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Modal.Container size={size} placement="center">
        <Modal.Dialog aria-label={label} className={className}>
          {children}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
