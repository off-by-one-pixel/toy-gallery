"use client";

import { ToyEditor } from "cone-editor";
import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";

type Style = {
  borderWidth: number;
  borderColor: string;
  color: string;
};

const MIN_BORDER = 0;
const MAX_BORDER = 10;

export default function Home() {
  const [style, setStyle] = useState<Style>({
    borderWidth: 2,
    borderColor: "#000000",
    color: "#add8e6",
  });
  const ref = useRef<SVGSVGElement>(null);

  const setColor = (color: string) => setStyle((s) => ({ ...s, color }));
  const setBorderColor = (borderColor: string) => setStyle((s) => ({ ...s, borderColor }));
  const setBorderWidth = (borderWidth: number) => setStyle((s) => ({ ...s, borderWidth }));

  return (
    <main className="min-h-screen p-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Cone Editor — demo</h1>
          <p className="text-sm text-neutral-600">
            Showcase for the <code className="font-mono">cone-editor</code> React component.
          </p>
        </div>
        <ExportMenu svgRef={ref} />
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-5">
        <ColorSwatch label="Toy" value={style.color} onChange={setColor} />
        <ColorSwatch label="Border" value={style.borderColor} onChange={setBorderColor} />
        <StrokeField value={style.borderWidth} onChange={setBorderWidth} />
      </div>

      <div className="h-[640px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <ToyEditor style={style} ref={ref} />
      </div>
    </main>
  );
}

/* ---------- Color swatch with popover ---------- */

function ColorSwatch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
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

/* ---------- Stroke slider ---------- */

function StrokeField({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex min-w-[220px] items-center gap-3 text-xs">
      <span className="uppercase tracking-wider text-neutral-500">Stroke</span>
      <input
        type="range"
        min={MIN_BORDER}
        max={MAX_BORDER}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
      />
      <span className="w-12 text-right font-mono text-neutral-900">
        {value.toFixed(1)} px
      </span>
    </label>
  );
}

/* ---------- Export SVG popover ---------- */

type ExportStatus = "idle" | "copied" | "downloaded" | "error";

function ExportMenu({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [width, setWidth] = useState(400);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const flash = (s: Exclude<ExportStatus, "idle">) => {
    setStatus(s);
    window.setTimeout(() => setStatus("idle"), 1800);
  };

  const serialize = (): string | null => {
    const node = svgRef.current;
    if (!node) return null;
    const clone = node.cloneNode(true) as SVGSVGElement;
    const vb = node.viewBox.baseVal;
    const aspect = vb && vb.width > 0 ? vb.height / vb.width : 1;
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(Math.round(width * aspect)));
    clone.removeAttribute("style");
    return `<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}`;
  };

  const handleCopy = async () => {
    const svg = serialize();
    if (!svg) return flash("error");
    try {
      await navigator.clipboard.writeText(svg);
      flash("copied");
    } catch {
      flash("error");
    }
  };

  const handleDownload = () => {
    const svg = serialize();
    if (!svg) return flash("error");
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "toy.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash("downloaded");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm transition-colors hover:border-neutral-400"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        Export SVG
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-[260px] rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
          <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Export SVG
          </h3>

          <label className="mb-3 flex items-center justify-between gap-3 text-xs">
            <span className="uppercase tracking-wider text-neutral-500">Width</span>
            <span className="inline-flex items-center gap-1">
              <input
                type="number"
                min={50}
                max={4000}
                step={10}
                value={width}
                onChange={(e) => setWidth(Math.max(10, Number(e.target.value) || 0))}
                className="w-20 rounded border border-neutral-300 px-2 py-1 text-right font-mono"
              />
              <span className="text-neutral-500">px</span>
            </span>
          </label>

          <div className="flex flex-col gap-1">
            <ExportAction
              label="Copy to clipboard"
              shortcut="⌘C"
              state={status === "copied" ? "ok" : "idle"}
              onClick={handleCopy}
            />
            <ExportAction
              label="Download"
              shortcut=".svg"
              state={status === "downloaded" ? "ok" : "idle"}
              onClick={handleDownload}
            />
          </div>

          {status === "error" && (
            <p className="mt-2 text-xs text-red-600">Something went wrong — try again.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ExportAction({
  label,
  shortcut,
  state,
  onClick,
}: {
  label: string;
  shortcut?: string;
  state: "idle" | "ok";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded px-2 py-1.5 text-sm text-neutral-900 hover:bg-neutral-100"
    >
      <span>{label}</span>
      {state === "ok" ? (
        <span className="inline-flex items-center gap-1 text-xs text-green-600">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5L20 7" />
          </svg>
          done
        </span>
      ) : shortcut ? (
        <span className="font-mono text-[10px] text-neutral-400">{shortcut}</span>
      ) : null}
    </button>
  );
}
