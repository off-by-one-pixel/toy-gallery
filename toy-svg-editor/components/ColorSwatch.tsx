"use client";

import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";

type Props = {
  label: string;
  value: string;
  onChange: (hex: string) => void;
};

export function ColorSwatch({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex items-center gap-2 text-xs">
      <span className="uppercase tracking-wider text-neutral-500">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-2 py-1 shadow-sm transition-colors hover:border-neutral-400"
      >
        <span
          className="h-4 w-4 rounded-sm border border-black/15"
          style={{ background: value }}
        />
        <span className="font-mono text-neutral-700">{value}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
          <HexColorPicker color={value} onChange={onChange} />
          <input
            type="text"
            className="mt-2 w-full rounded border border-neutral-300 px-2 py-1 font-mono text-xs"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
