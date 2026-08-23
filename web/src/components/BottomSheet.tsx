'use client';

import { createContext, type ReactNode } from 'react';
import { Drawer, useOverlayState } from '@heroui/react';

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}>;

export const BottomSheetContext = createContext(false);

export default function BottomSheet({ open, onClose, label, children }: Props) {
  const state = useOverlayState({
    isOpen: open,
    onOpenChange: (isOpen) => {
      if (!isOpen) onClose();
    },
  });

  return (
    <Drawer.Root state={state}>
      <Drawer.Backdrop className="sm:hidden">
        <Drawer.Content placement="bottom">
          <Drawer.Dialog aria-label={label} className="max-h-[80dvh] w-full rounded-t-2xl px-2 pt-2 pb-5">
            <Drawer.Handle />
            <BottomSheetContext.Provider value={true}>{children}</BottomSheetContext.Provider>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}
