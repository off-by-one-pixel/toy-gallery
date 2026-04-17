"use client";

const MIN_BORDER = 0;
const MAX_BORDER = 10;

type Props = {
  value: number;
  onChange: (v: number) => void;
};

export function StrokeField({ value, onChange }: Props) {
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
