'use client';

import { useEffect, useRef, useState } from 'react';
import { APIError, downloadExport, importFromFile } from '../services/api';

type Props = {
  onImported: () => void;
  count: number | null;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

const errorMessage = (err: unknown): string => {
  if (err instanceof SyntaxError) return 'File is not valid JSON';
  if (err instanceof APIError) {
    const detail = typeof err.data === 'string' ? err.data : JSON.stringify(err.data);
    return detail.length > 120 ? err.message : detail;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
};

export default function CollectionMenu({ onImported, count }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const rootRef = useRef<HTMLSpanElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleExport = async () => {
    setStatus({ kind: 'busy' });
    try {
      await downloadExport();
      setStatus({ kind: 'ok', message: 'Exported' });
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  };

  const handleImportFile = async (file: File) => {
    setStatus({ kind: 'busy' });
    try {
      const result = await importFromFile(file);
      setStatus({
        kind: 'ok',
        message: `Imported ${result.created} ${result.created === 1 ? 'toy' : 'toys'}`,
      });
      onImported();
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    }
  };

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
            disabled={status.kind === 'busy'}
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
            disabled={status.kind === 'busy'}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21V9" />
                <path d="m7 14 5-5 5 5" />
                <path d="M5 3h14" />
              </svg>
            }
          />
          {status.kind === 'ok' && (
            <p className="px-2 pt-2 pb-1 text-xs text-green-700">{status.message}</p>
          )}
          {status.kind === 'error' && (
            <p className="px-2 pt-2 pb-1 text-xs text-red-600">{status.message}</p>
          )}
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
