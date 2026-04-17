"use client";

import { ToyEditor } from "cone-editor";
import { useRef, useState } from "react";

import { ColorSwatch } from "@/components/ColorSwatch";
import { ExportMenu } from "@/components/ExportMenu";
import { StrokeField } from "@/components/StrokeField";

type Style = {
  borderWidth: number;
  borderColor: string;
  color: string;
};

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
