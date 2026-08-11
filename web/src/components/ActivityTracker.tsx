'use client';

import { cloneElement, type ReactElement, type ReactNode } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';

import { ACTIVITY_PALETTE } from '../services/activityPalette';
import type { ActivityCell, ActivityHeatmap, DimensionView } from '../services/activity';

type Props = Readonly<{
  heatmap: ActivityHeatmap;
  children?: ReactNode;
}>;

export default function ActivityTracker({ heatmap, children }: Props) {
  return (
    <div className="mx-auto grid max-w-300 grid-cols-1 gap-6 rounded-lg bg-surface/60 px-4 pt-3 pb-4 sm:grid-cols-2 sm:gap-8">
      <DimensionHeatmap view={heatmap.length} />
      <DimensionHeatmap view={heatmap.circumference} />
      <DimensionHeatmap view={heatmap.sessions} />
      {children}
    </div>
  );
}

function DimensionHeatmap({ view }: Readonly<{ view: DimensionView }>) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{view.title}</h3>
      <div>
        <CalendarHeatmap
          startDate={view.startDate}
          endDate={view.endDate}
          values={view.cells}
          showWeekdayLabels
          gutterSize={2}
          transformDayElement={(rect, value) => {
            const cell = value as ActivityCell | null;
            const fill = cell?.fill ?? ACTIVITY_PALETTE.empty;
            const el = rect as unknown as ReactElement<React.SVGProps<SVGRectElement>>;
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
