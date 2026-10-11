'use client';

import { useState, type ReactNode } from 'react';
import { Dropdown } from '@heroui/react';

import BottomSheet from '@/components/BottomSheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';

type OverlayContext = Readonly<{
  close: () => void;
  mode: 'popover' | 'sheet';
}>;

type Props = Readonly<{
  label: string;
  trigger: ReactNode;
  triggerClassName: string;
  placement?: 'bottom start' | 'bottom end';
  popoverClassName?: string;
  children: (ctx: OverlayContext) => ReactNode;
}>;

export default function ResponsiveOverlay({
  label,
  trigger,
  triggerClassName,
  placement = 'bottom start',
  popoverClassName,
  children,
}: Props) {
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isDesktop) {
    return (
      <Dropdown>
        <Dropdown.Trigger aria-label={label} className={triggerClassName}>
          {trigger}
        </Dropdown.Trigger>
        <Dropdown.Popover placement={placement} className={popoverClassName}>
          {children({ close: () => {}, mode: 'popover' })}
        </Dropdown.Popover>
      </Dropdown>
    );
  }

  return (
    <>
      <button type="button" aria-label={label} className={triggerClassName} onClick={() => setSheetOpen(true)}>
        {trigger}
      </button>
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} label={label}>
        {children({ close: () => setSheetOpen(false), mode: 'sheet' })}
      </BottomSheet>
    </>
  );
}
