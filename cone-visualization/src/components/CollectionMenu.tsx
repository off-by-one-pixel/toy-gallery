'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadExport, importFromFile } from '../services/api';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useToasts } from '../providers/ToastProvider';

type Props = {
  onImported: () => void;
  count: number | null;
};

export default function CollectionMenu({ onImported, count }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const runAction = useAsyncAction();
  const { showToast } = useToasts();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const handleExport = () =>
    runAction(downloadExport, {
      busy: setBusy,
      onSuccess: () => {
        showToast('Exported collection', 'success');
        setOpen(false);
      },
    });

  const handleImportFile = (file: File) =>
    runAction(() => importFromFile(file), {
      busy: setBusy,
      onSuccess: (result) => {
        showToast(
          `Imported ${result.created} ${result.created === 1 ? 'toy' : 'toys'}`,
          'success',
        );
        setOpen(false);
        onImported();
      },
    });

  return (
    <span ref={rootRef} className="relative inline-flex items-baseline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="group inline-flex items-baseline gap-2 rounded-md px-1 -mx-1 text-left transition-colors hover:bg-neutral-200/60"
      >
        <span className="text-lg font-semibold tracking-tight text-neutral-900">Toy Gallery</span>
        {count != null && (
          <span className="text-sm font-normal text-neutral-500">
            {count} {count === 1 ? 'item' : 'items'}
          </span>
        )}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-neutral-400 transition-colors group-hover:text-neutral-600"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-2 w-60 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg"
        >
          <MenuItem
            label="Export collection"
            description="Download the gallery as JSON"
            onClick={handleExport}
            disabled={busy}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
            }
          />
          <MenuItem
            label="Import collection"
            description="Add toys from a JSON file"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21V9" />
                <path d="m7 14 5-5 5 5" />
                <path d="M5 3h14" />
              </svg>
            }
          />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) handleImportFile(file);
        }}
      />
    </span>
  );
}

function MenuItem({
  label,
  description,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-2.5 rounded px-2 py-1.5 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 disabled:opacity-60"
    >
      <span className="mt-0.5 text-neutral-500">{icon}</span>
      <span className="flex flex-col">
        <span className="font-medium">{label}</span>
        <span className="text-[11px] text-neutral-500">{description}</span>
      </span>
    </button>
  );
}
