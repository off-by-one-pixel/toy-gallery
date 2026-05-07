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

const lightnessAt = (t: number): number =>
  lerp(ACTIVITY_PALETTE.lightnessMax, ACTIVITY_PALETTE.lightnessMin, Math.pow(t, ACTIVITY_PALETTE.gamma));

const hslAt = (hue: number, t: number): string =>
  `hsl(${hue}, ${ACTIVITY_PALETTE.saturation}%, ${lightnessAt(t).toFixed(1)}%)`;

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
  return hslAt(hue, intensity);
}

const LEGEND_STOPS = 11;
const legendGradient = (hue: number): string => {
  const stops = Array.from({ length: LEGEND_STOPS }, (_, i) => {
    const t = i / (LEGEND_STOPS - 1);
    return `${hslAt(hue, t)} ${(t * 100).toFixed(1)}%`;
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
};

const extent = (values: number[]): { min: number; max: number } =>
  values.length === 0
    ? { min: 0, max: 0 }
    : { min: Math.min(...values), max: Math.max(...values) };

const pluck = (
  days: ActivityDay[],
  pick: (d: ActivityDay) => number | null | undefined,
): number[] => days.map(pick).filter((v): v is number => v != null);

export default function ActivityTracker({ days }: Props) {
  const { byDate, startDate, endDate, lenMin, lenMax, circMin, circMax } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today.getTime() - (WINDOW_DAYS - 1) * MS_PER_DAY);
    const map: SessionDayMap = new Map(days.map((d) => [d.date, d]));
    const lengthRange = extent(pluck(days, (d) => d.maxInsertableLength));
    const circRange = extent(pluck(days, (d) => d.maxCircumference));
    return {
      byDate: map,
      startDate: start,
      endDate: today,
      lenMin: lengthRange.min,
      lenMax: lengthRange.max,
      circMin: circRange.min,
      circMax: circRange.max,
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
      <div>
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
      <div className="-mt-4 ml-auto flex w-1/3 items-center gap-2 text-[10px] tabular-nums text-neutral-500">
        <span>{max > 0 ? `${formatValue(min, unit)} ${unit.id}` : '—'}</span>
        <span aria-hidden className="h-1.5 flex-1 rounded-full" style={{ background: legendGradient(hue) }} />
        <span>{max > 0 ? `${formatValue(max, unit)} ${unit.id}` : '—'}</span>
      </div>
    </div>
  );
}
