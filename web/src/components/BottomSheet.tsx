'use client';

import { createContext, useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}>;

const DISMISS_DRAG_PX = 80;

export const BottomSheetContext = createContext(false);

export default function BottomSheet({ open, onClose, label, children }: Props) {
  const common = useTranslations('common');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragRef = useRef<{ startY: number; target: EventTarget | null; dragging: boolean } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    if (!open) return;
    setDragOffset(0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const scrolledInside = (target: EventTarget | null): boolean => {
    let element = target instanceof Element ? target : null;
    while (element && element !== dialogRef.current) {
      if (element.scrollTop > 0) return true;
      element = element.parentElement;
    }
    return (dialogRef.current?.scrollTop ?? 0) > 0;
  };

  const onTouchStart = (event: TouchEvent) => {
    dragRef.current = { startY: event.touches[0].clientY, target: event.target, dragging: false };
  };

  const onTouchMove = (event: TouchEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = event.touches[0].clientY - drag.startY;
    if (!drag.dragging) {
      if (delta <= 0 || scrolledInside(drag.target)) return;
      drag.dragging = true;
    }
    setDragOffset(Math.max(0, delta));
  };

  const onTouchEnd = () => {
    const wasDragging = dragRef.current?.dragging === true;
    dragRef.current = null;
    if (wasDragging && dragOffset > DISMISS_DRAG_PX) onClose();
    else setDragOffset(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-40 sm:hidden">
      <button type="button" aria-label={common('close')} onClick={onClose} className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-x-0 bottom-0">
        <dialog
          ref={dialogRef}
          open
          aria-modal="true"
          aria-label={label}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)`, transition: 'none' } : undefined}
          className="static m-0 flex max-h-[80dvh] w-full max-w-none flex-col overscroll-contain rounded-t-2xl bg-surface px-2 pt-2 pb-5 text-foreground shadow-2xl transition-transform duration-150"
        >
          <div className="shrink-0 pb-1.5">
            <div className="mx-auto h-1 w-9 rounded-full bg-border-secondary" />
          </div>
          <BottomSheetContext.Provider value={true}>{children}</BottomSheetContext.Provider>
        </dialog>
      </div>
    </div>,
    document.body,
  );
}
