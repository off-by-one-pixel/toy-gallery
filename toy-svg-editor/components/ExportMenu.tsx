"use client";

import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

type Status = "idle" | "copied" | "downloaded" | "error";

type Props = {
  svgRef: RefObject<SVGSVGElement | null>;
};

export function ExportMenu({ svgRef }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
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

  const flash = (s: Exclude<Status, "idle">) => {
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
