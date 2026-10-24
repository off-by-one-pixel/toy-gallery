'use client';

import { cloneElement, type ReactElement, type ReactNode } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';

import { ACTIVITY_PALETTE } from '@/features/sessions/stats/activityPalette';
import type { ActivityCell, DimensionView } from '@/features/sessions/stats/activity';
import type { FrequencyView, StatViewItem, WeeklyView } from '@/features/sessions/stats/statsView';

type Props = Readonly<{ items: readonly StatViewItem[] }>;

type HeatmapRect = ReactElement<React.SVGProps<SVGRectElement>>;

const asHeatmapRect = (rect: unknown): HeatmapRect => rect as HeatmapRect;

const asActivityCell = (value: unknown): ActivityCell | null => (value ?? null) as ActivityCell | null;

export default function ActivityTracker({ items }: Props) {
  return (
    <div className="mx-auto grid max-w-300 grid-cols-1 gap-6 rounded-lg bg-surface/60 px-4 pt-3 pb-4 sm:grid-cols-2 sm:gap-8">
      {items.map((item) => (
        <StatItem key={item.key} item={item} />
      ))}
    </div>
  );
}

function StatItem({ item }: Readonly<{ item: StatViewItem }>) {
  if (item.kind === 'calendar') return <DimensionHeatmap view={item.view} />;
  if (item.kind === 'weekly') return <WeeklyBars view={item.view} />;
  return <FrequencyStrip view={item.view} />;
}

function StatTitle({ title, summary }: Readonly<{ title: string; summary?: string | null }>) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted">{title}</h3>
      {summary && <span className="text-xs font-semibold tabular-nums text-foreground">{summary}</span>}
    </div>
  );
}

function StatLegend({
  min,
  max,
  gradient,
  className,
}: Readonly<{ min: ReactNode; max: ReactNode; gradient: string; className: string }>) {
  return (
    <div className={`ml-auto flex w-1/3 items-center gap-2 text-caption tabular-nums text-muted ${className}`}>
      <span>{min}</span>
      <span aria-hidden className="h-1.5 flex-1 rounded-full" style={{ background: gradient }} />
      <span>{max}</span>
    </div>
  );
}

function DimensionHeatmap({ view }: Readonly<{ view: DimensionView }>) {
  return (
    <div>
      <StatTitle title={view.title} summary={view.summary} />
      <div>
        <CalendarHeatmap
          startDate={view.startDate}
          endDate={view.endDate}
          values={view.cells}
          showWeekdayLabels
          gutterSize={2}
          transformDayElement={(rect, value) => {
            const cell = asActivityCell(value);
            const fill = cell?.fill ?? ACTIVITY_PALETTE.empty;
            const el = asHeatmapRect(rect);
            return cloneElement(
              el,
              { style: { ...el.props.style, fill } },
              cell?.tooltip ? <title>{cell.tooltip}</title> : null,
            );
          }}
        />
      </div>
      <StatLegend
        min={view.legendMinLabel}
        max={view.legendMaxLabel}
        gradient={view.legendGradient}
        className="-mt-4"
      />
    </div>
  );
}

function FrequencyStrip({ view }: Readonly<{ view: FrequencyView }>) {
  return (
    <div>
      <StatTitle title={view.title} />
      {view.total === 0 ? (
        <p className="py-2 text-caption text-text-tertiary">{view.emptyLabel}</p>
      ) : (
        <>
          <div className="flex gap-0.5">
            {view.cells.map((cell) => (
              <span
                key={cell.key}
                className="h-4 flex-1 rounded-sm"
                style={{ background: cell.fill }}
                title={cell.tooltip}
              />
            ))}
          </div>
          <div className="mt-1 flex gap-0.5 text-[9px] tabular-nums text-text-tertiary">
            {view.cells.map((cell) => (
              <span key={cell.key} className="flex-1 text-center">
                {cell.label}
              </span>
            ))}
          </div>
          <StatLegend min={view.legendMin} max={view.max} gradient={view.legendGradient} className="mt-2" />
        </>
      )}
    </div>
  );
}

function WeeklyBars({ view }: Readonly<{ view: WeeklyView }>) {
  return (
    <div className="sm:col-span-2">
      <StatTitle title={view.title} summary={view.summary} />
      {view.total === 0 ? (
        <p className="py-2 text-caption text-text-tertiary">{view.emptyLabel}</p>
      ) : (
        <div className="flex gap-2 text-caption tabular-nums text-muted">
          <span className="-translate-y-1/2 self-start">{view.maxLabel}</span>
          <div className="flex-1">
            <div className="flex h-24 items-end gap-0.5 border-y border-border">
              {view.bars.map((bar) => (
                <span key={bar.week} title={bar.tooltip} className="group flex h-full flex-1 items-end">
                  <span
                    className="w-full rounded-t-sm group-hover:opacity-75"
                    style={{ height: `${bar.height}%`, background: view.fill }}
                  />
                </span>
              ))}
            </div>
            <div className="mt-1 flex justify-between">
              <span>{view.startLabel}</span>
              <span>{view.endLabel}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
