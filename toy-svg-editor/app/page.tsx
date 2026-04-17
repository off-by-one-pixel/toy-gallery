"use client";

import { ToyEditor } from "cone-editor";
import { useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";

type Style = {
  borderWidth: number;
  borderColor: string;
  color: string;
};

const MIN_WIDTH = 5;
const MAX_WIDTH = 200;
const MIN_BORDER = 0;
const MAX_BORDER = 10;

export default function Home() {
  const [style, setStyle] = useState<Style>({
    borderWidth: 2,
    borderColor: "#000000",
    color: "#add8e6",
  });
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(100);
  const [copyStatus, setCopyStatus] = useState<0 | 1 | -1>(0);

  const setColor = (color: string) => setStyle((s) => ({ ...s, color }));
  const setBorderColor = (borderColor: string) => setStyle((s) => ({ ...s, borderColor }));
  const setBorderWidth = (borderWidth: number) => setStyle((s) => ({ ...s, borderWidth }));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ref.current?.outerHTML ?? "");
      setCopyStatus(1);
      setTimeout(() => setCopyStatus(0), 2000);
    } catch {
      setCopyStatus(-1);
      setTimeout(() => setCopyStatus(0), 2000);
    }
  };

  const copyLabel = copyStatus === 0 ? "Copy SVG" : copyStatus === 1 ? "Copied" : "Failed";
  const copyClass =
    copyStatus === 0
      ? "bg-black hover:bg-neutral-800"
      : copyStatus === 1
        ? "bg-green-600 hover:bg-green-700"
        : "bg-red-600 hover:bg-red-700";

  return (
    <main className="min-h-screen p-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Cone Editor — demo</h1>
        <p className="text-sm text-neutral-600">
          Showcase for the <code className="font-mono">cone-editor</code> React component.
        </p>
      </header>

      <div className="flex flex-wrap gap-6">
        <div className="smallPicker">
          <label className="text-xs uppercase tracking-wider text-neutral-500">Toy color</label>
          <HexColorPicker color={style.color} onChange={setColor} />
          <input
            type="text"
            className="mt-2 w-[120px] rounded border border-neutral-300 px-2 py-1 font-mono text-xs"
            value={style.color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>

        <div className="smallPicker">
          <label className="text-xs uppercase tracking-wider text-neutral-500">Border color</label>
          <HexColorPicker color={style.borderColor} onChange={setBorderColor} />
          <input
            type="text"
            className="mt-2 w-[120px] rounded border border-neutral-300 px-2 py-1 font-mono text-xs"
            value={style.borderColor}
            onChange={(e) => setBorderColor(e.target.value)}
          />
        </div>

        <div className="flex min-w-[240px] flex-1 flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs">
            <span className="flex justify-between uppercase tracking-wider text-neutral-500">
              SVG width
              <span className="font-mono text-neutral-900">{Math.round(width)} px</span>
            </span>
            <input
              type="range"
              min={MIN_WIDTH}
              max={MAX_WIDTH}
              step={1}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="flex justify-between uppercase tracking-wider text-neutral-500">
              Stroke width
              <span className="font-mono text-neutral-900">
                {style.borderWidth.toFixed(1)} px
              </span>
            </span>
            <input
              type="range"
              min={MIN_BORDER}
              max={MAX_BORDER}
              step={0.5}
              value={style.borderWidth}
              onChange={(e) => setBorderWidth(Number(e.target.value))}
            />
          </label>

          <button
            type="button"
            onClick={handleCopy}
            className={`self-start rounded px-4 py-2 text-sm font-medium text-white transition-colors ${copyClass}`}
          >
            {copyLabel}
          </button>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <ToyEditor style={style} width={width} ref={ref} />
      </div>
    </main>
  );
}
