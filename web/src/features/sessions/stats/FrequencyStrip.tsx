'use client';

import type { ReactNode } from 'react';

type FrequencyCell = Readonly<{
  key: string | number;
  label: ReactNode;
  fill: string;
  tooltip: string;
}>;

type Props = Readonly<{
  title: string;
  emptyLabel: string;
  total: number;
  legendMin: number;
  max: number;
  legendGradient: string;
  cells: readonly FrequencyCell[];
}>;

export default function FrequencyStrip({ title, emptyLabel, total, legendMin, max, legendGradient, cells }: Props) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{title}</h3>
      {total === 0 ? (
        <p className="py-2 text-caption text-text-tertiary">{emptyLabel}</p>
      ) : (
        <>
          <div className="flex gap-0.5">
            {cells.map((cell) => (
              <span
                key={cell.key}
                className="h-4 flex-1 rounded-sm"
                style={{ background: cell.fill }}
                title={cell.tooltip}
              />
            ))}
          </div>
          <div className="mt-1 flex gap-0.5 text-[9px] tabular-nums text-text-tertiary">
            {cells.map((cell) => (
              <span key={cell.key} className="flex-1 text-center">
                {cell.label}
              </span>
            ))}
          </div>
          <div className="mt-2 ml-auto flex w-1/3 items-center gap-2 text-caption tabular-nums text-muted">
            <span>{legendMin}</span>
            <span aria-hidden className="h-1.5 flex-1 rounded-full" style={{ background: legendGradient }} />
            <span>{max}</span>
          </div>
        </>
      )}
    </div>
  );
}
