'use client';

import { cloneElement, type ReactElement } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';

import { ACTIVITY_PALETTE } from '@/features/sessions/stats/activityPalette';
import type { ActivityCell, DimensionView } from '@/features/sessions/stats/activity';
import type { StatViewItem } from '@/features/sessions/stats/statsView';
import FrequencyStrip from '@/features/sessions/stats/FrequencyStrip';

type Props = Readonly<{ items: readonly StatViewItem[] }>;

type HeatmapRect = ReactElement<React.SVGProps<SVGRectElement>>;

const asHeatmapRect = (rect: unknown): HeatmapRect => rect as HeatmapRect;

const asActivityCell = (value: unknown): ActivityCell | null => (value ?? null) as ActivityCell | null;

export default function ActivityTracker({ items }: Props) {
  return (
    <div className="mx-auto grid max-w-300 grid-cols-1 gap-6 rounded-lg bg-surface/60 px-4 pt-3 pb-4 sm:grid-cols-2 sm:gap-8">
      {items.map((item) => (
        <StatView key={item.key} item={item} />
      ))}
    </div>
  );
}

function StatView({ item }: Readonly<{ item: StatViewItem }>) {
  if (item.kind === 'calendar') return <DimensionHeatmap view={item.view} />;
  return <FrequencyStrip {...item.view} />;
}

function DimensionHeatmap({ view }: Readonly<{ view: DimensionView }>) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted">{view.title}</h3>
        {view.summary && <span className="text-xs font-semibold tabular-nums text-foreground">{view.summary}</span>}
      </div>
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
      <div className="-mt-4 ml-auto flex w-1/3 items-center gap-2 text-caption tabular-nums text-muted">
        <span>{view.legendMinLabel}</span>
        <span aria-hidden className="h-1.5 flex-1 rounded-full" style={{ background: view.legendGradient }} />
        <span>{view.legendMaxLabel}</span>
      </div>
    </div>
  );
}
