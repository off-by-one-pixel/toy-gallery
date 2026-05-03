'use client';

import { cloneElement, useMemo, type ReactElement } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';

import { useUnit } from '../providers/UnitProvider';
import { ACTIVITY_PALETTE } from '../services/activityPalette';
import { formatValue } from '../services/units';
import type { ActivityDay } from '../services/types';

const WINDOW_DAYS = 365;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type Props = {
  days: ActivityDay[];
};

type DayCell = {
  date: string;
  fill: string;
};

type SessionDayMap = Map<string, ActivityDay>;

const localDateKey = (d: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatTooltipDate = (key: string): string => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function colorFor(
  value: number | null | undefined,
  min: number,
  max: number,
  hue: number,
  hasSession: boolean,
): string {
  if (!hasSession) return ACTIVITY_PALETTE.empty;
  if (value == null) return ACTIVITY_PALETTE.usedOnly;
  const intensity = max > min ? (value - min) / (max - min) : 1;
  const lightness = lerp(ACTIVITY_PALETTE.lightnessMax, ACTIVITY_PALETTE.lightnessMin, intensity);
  return `hsl(${hue}, ${ACTIVITY_PALETTE.saturation}%, ${lightness.toFixed(1)}%)`;
}

export default function ActivityTracker({ days }: Props) {
  const { byDate, startDate, endDate, lenMin, lenMax, circMin, circMax } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today.getTime() - (WINDOW_DAYS - 1) * MS_PER_DAY);
    const map: SessionDayMap = new Map(days.map((d) => [d.date, d]));
    let lMax = 0;
    let cMax = 0;
    let lMin = Infinity;
    let cMin = Infinity;
    for (const d of days) {
      if (d.maxInsertableLength != null) {
        if (d.maxInsertableLength > lMax) lMax = d.maxInsertableLength;
        if (d.maxInsertableLength < lMin) lMin = d.maxInsertableLength;
      }
      if (d.maxCircumference != null) {
        if (d.maxCircumference > cMax) cMax = d.maxCircumference;
        if (d.maxCircumference < cMin) cMin = d.maxCircumference;
      }
    }
    return {
      byDate: map,
      startDate: start,
      endDate: today,
      lenMin: Number.isFinite(lMin) ? lMin : 0,
      lenMax: lMax,
      circMin: Number.isFinite(cMin) ? cMin : 0,
      circMax: cMax,
    };
  }, [days]);

  return (
    <div className="mx-auto grid max-w-300 grid-cols-1 gap-6 rounded-lg bg-white/60 px-4 pt-3 pb-4 sm:grid-cols-2 sm:gap-8">
      <DimensionHeatmap
        title="Length"
        byDate={byDate}
        startDate={startDate}
        endDate={endDate}
        pickValue={(d) => d.maxInsertableLength}
        min={lenMin}
        max={lenMax}
        hue={ACTIVITY_PALETTE.lengthHue}
      />
      <DimensionHeatmap
        title="Circumference"
        byDate={byDate}
        startDate={startDate}
        endDate={endDate}
        pickValue={(d) => d.maxCircumference}
        min={circMin}
        max={circMax}
        hue={ACTIVITY_PALETTE.circumferenceHue}
      />
    </div>
  );
}

type DimensionHeatmapProps = {
  title: string;
  byDate: SessionDayMap;
  startDate: Date;
  endDate: Date;
  pickValue: (day: ActivityDay) => number | null | undefined;
  min: number;
  max: number;
  hue: number;
};

function DimensionHeatmap({ title, byDate, startDate, endDate, pickValue, min, max, hue }: DimensionHeatmapProps) {
  const { unit } = useUnit();
  const values = useMemo<DayCell[]>(() => {
    const cells: DayCell[] = [];
    for (let i = 0; i < WINDOW_DAYS; i++) {
      const date = new Date(startDate.getTime() + i * MS_PER_DAY);
      const key = localDateKey(date);
      const day = byDate.get(key);
      const fill = colorFor(day ? pickValue(day) : null, min, max, hue, day != null);
      cells.push({ date: key, fill });
    }
    return cells;
  }, [byDate, startDate, pickValue, min, max, hue]);

  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">{title}</h3>
      {/* react-calendar-heatmap's getHeight() overcounts by getWeekdayLabelSize()
          (30 viewBox units) on horizontal layouts, leaving phantom whitespace at
          the bottom of the SVG. Wrap in an aspect-ratio container that matches
          the actual content (664/96) and clip the overflow. */}
      <div className="overflow-hidden" style={{ aspectRatio: '664 / 96' }}>
        <CalendarHeatmap
          startDate={startDate}
          endDate={endDate}
          values={values}
          showWeekdayLabels
          gutterSize={2}
          transformDayElement={(rect, value) => {
            const cell = value as DayCell | null;
            const fill = cell?.fill ?? ACTIVITY_PALETTE.empty;
            const el = rect as unknown as ReactElement<React.SVGProps<SVGRectElement>>;
            return cloneElement(
              el,
              { style: { ...el.props.style, fill } },
              cell?.date ? <title>{formatTooltipDate(cell.date)}</title> : null,
            );
          }}
        />
      </div>
      <div className="mt-2 ml-auto flex w-1/3 items-center gap-2 text-[10px] tabular-nums text-neutral-500">
        <span>{max > 0 ? `${formatValue(min, unit)} ${unit.id}` : '—'}</span>
        <span
          aria-hidden
          className="h-1.5 flex-1 rounded-full"
          style={{
            background: `linear-gradient(to right, hsl(${hue}, ${ACTIVITY_PALETTE.saturation}%, ${ACTIVITY_PALETTE.lightnessMax}%), hsl(${hue}, ${ACTIVITY_PALETTE.saturation}%, ${ACTIVITY_PALETTE.lightnessMin}%))`,
          }}
        />
        <span>{max > 0 ? `${formatValue(max, unit)} ${unit.id}` : '—'}</span>
      </div>
    </div>
  );
}
