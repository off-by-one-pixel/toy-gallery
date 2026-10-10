'use client';

import { memo, type Ref } from 'react';
import { Image as ImageIcon, Pencil, Trash2, Video } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ActionButtons, type ActionDef } from '@/components/ActionButtons';
import { useGirth } from '@/features/preferences/GirthProvider';
import { displayGirth } from '@/features/preferences/girth';
import { formatElapsed, formatElapsedSeconds, secondsBetween } from '@/lib/duration';
import { useNow } from '@/hooks/useNow';
import { heightScale } from '@/features/toys/scaling';
import { formatWhen } from '@/lib/dates';
import { sortEntriesByInvolvement } from '@/features/sessions/session';
import { useSession } from '@/features/sessions/useSessions';
import type { Session, Toy } from '@/api/types';
import { type Unit } from '@/features/preferences/units';
import LiveBadge from '@/features/sessions/live/LiveBadge';
import MiniToy from '@/features/sessions/list/MiniToy';
import PeakRow from '@/features/sessions/list/PeakRow';
import SessionMediaStrip from '@/features/sessions/media/SessionMediaStrip';
import { useMediaStatus } from '@/features/sessions/media/useMediaStrip';
import RecordTrophy from '@/features/sessions/list/RecordTrophy';
import SessionRecordList from '@/features/sessions/list/SessionRecordList';
import { recordDisplay, type RecordPeak } from '@/features/sessions/records';

const STRIP_LIMIT = 5;

const ROW_TONES = {
  live: { border: 'border-live', ring: 'ring-2 ring-live' },
  record: { border: 'border-amber-500', ring: 'ring-2 ring-amber-500' },
  default: { border: 'border-border', ring: 'ring-2 ring-accent' },
} as const;

const rowTone = (session: Session): (typeof ROW_TONES)[keyof typeof ROW_TONES] => {
  if (session.isLive) return ROW_TONES.live;
  if (session.records.length > 0) return ROW_TONES.record;
  return ROW_TONES.default;
};

type Props = Readonly<{
  session: Session;
  toysById: Map<number, Toy>;
  unit: Unit;
  selected: boolean;
  flash?: boolean;
  ref?: Ref<HTMLDivElement>;
  onToggleSelect: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}>;

function SessionRow({
  session: listed,
  toysById,
  unit,
  selected,
  flash = false,
  ref,
  onToggleSelect,
  onEdit,
  onDelete,
}: Props) {
  const session = useSession(listed.id, listed).session ?? listed;
  const t = useTranslations('session');
  const photoCount = session.photoCount ?? 0;
  const videoCount = session.videoCount ?? 0;
  const common = useTranslations('common');
  const catalog = useTranslations();
  const { configured: mediaConfigured } = useMediaStatus();
  const locale = useLocale();
  const { girth } = useGirth();
  const whenT = (key: 'today' | 'yesterday') => t(key);

  const tone = rowTone(session);
  const orderedEntries = sortEntriesByInvolvement(session.entries, toysById);
  const visibleEntries = selected ? orderedEntries : orderedEntries.slice(0, STRIP_LIMIT);
  const overflow = orderedEntries.length - visibleEntries.length;

  const scale = heightScale(orderedEntries.map((e) => toysById.get(e.toy)));
  const now = useNow(1000, session.isLive);
  const totalMinutes = session.totalToyDurationMinutes ?? 0;
  const timeValue = session.isLive
    ? formatElapsedSeconds(Math.max(0, secondsBetween(session.startedAt, now.toISOString())), locale)
    : formatElapsed(totalMinutes, locale);

  const recordCtx = { t: catalog, girth, unit, locale };
  const recordLabel = (key: string) => recordDisplay(key)?.label(recordCtx);
  const peakRecordLabel = (peak: RecordPeak) => {
    const record = session.records.find((r) => recordDisplay(r.key)?.peak === peak);
    return record ? recordLabel(record.key) : undefined;
  };
  const entryRecordLabels = (toyId: number) =>
    session.records.filter((r) => r.toy === toyId).flatMap((r) => recordLabel(r.key) ?? []);

  const actions: ActionDef[] = [
    { key: 'edit', label: common('edit'), icon: Pencil, variant: 'outline', onPress: () => onEdit(session.id) },
    {
      key: 'delete',
      label: common('delete'),
      icon: Trash2,
      variant: 'danger-soft',
      onPress: () => onDelete(session.id),
    },
  ];

  return (
    <div
      ref={ref}
      className={
        'group relative rounded-xl border bg-surface px-5 py-4 shadow-sm transition-shadow hover:shadow-md sm:grid sm:grid-cols-[180px_1fr_auto_auto] sm:items-center sm:gap-6 sm:px-6 sm:py-5 ' +
        [tone.border, selected && tone.ring, flash && 'row-flash'].filter(Boolean).join(' ')
      }
    >
      <button
        type="button"
        aria-label={t('detailsToggleLabel')}
        aria-expanded={selected}
        onClick={() => onToggleSelect(session.id)}
        className="absolute inset-0 cursor-pointer rounded-xl"
      />
      <div className="flex items-center justify-between gap-3 sm:contents">
        <div className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-foreground sm:order-1">
          <span className="whitespace-nowrap">{formatWhen(session.startedAt, new Date(), locale, whenT)}</span>
          {session.isLive && <LiveBadge />}
          {photoCount + videoCount > 0 && (
            <span
              aria-label={t('media.countsLabel', { photos: photoCount, videos: videoCount })}
              title={t('media.countsLabel', { photos: photoCount, videos: videoCount })}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent-soft px-2.5 py-1 text-sm font-medium tabular-nums text-accent-soft-foreground"
            >
              {photoCount > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <ImageIcon size={14} strokeWidth={2} />
                  {photoCount}
                </span>
              )}
              {videoCount > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <Video size={14} strokeWidth={2} />
                  {videoCount}
                </span>
              )}
            </span>
          )}
        </div>
        <div className="relative hidden gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 sm:order-4 sm:flex">
          <ActionButtons actions={actions} stopPropagation />
        </div>
      </div>
      <div className="mt-3 sm:mt-0 sm:contents">
        <div className="flex flex-wrap items-start gap-3 sm:order-2">
          {visibleEntries.map((entry) => {
            const toy = toysById.get(entry.toy);
            return (
              <MiniToy
                key={entry.toy}
                entry={entry}
                toy={toy}
                heightRatio={scale(toy)}
                recordLabels={entryRecordLabels(entry.toy)}
              />
            );
          })}
          {overflow > 0 && (
            <span className="self-center rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-medium text-muted">
              {t('overflowMore', { count: overflow })}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-border pt-2.5 sm:order-3 sm:mt-0 sm:grid sm:min-w-32 sm:shrink-0 sm:grid-cols-[auto_auto] sm:items-baseline sm:justify-end sm:gap-x-2.5 sm:gap-y-1 sm:border-t-0 sm:pt-0">
          <PeakRow
            label={t('peakLength')}
            mm={session.maxInsertableLength}
            unit={unit}
            recordLabel={peakRecordLabel('length')}
          />
          <PeakRow
            label={t(`peakGirth.${girth}`)}
            mm={displayGirth(session.maxCircumference, girth)}
            unit={unit}
            recordLabel={peakRecordLabel('circumference')}
          />
          {(session.isLive || totalMinutes > 0) && (
            <div className="flex items-baseline gap-2 py-0.5 sm:contents">
              <span className="text-caption uppercase tracking-wider text-text-tertiary sm:justify-self-end">
                {t('totalTime')}
              </span>
              <span
                className={
                  'whitespace-nowrap text-[15px] font-semibold tracking-tight tabular-nums sm:justify-self-start sm:text-[17px] ' +
                  (session.isLive ? 'rounded-full bg-live/15 px-2.5 py-0.5 text-live-strong' : 'text-foreground')
                }
              >
                {timeValue}
                {!session.isLive && peakRecordLabel('duration') && (
                  <RecordTrophy
                    label={peakRecordLabel('duration') as string}
                    className="relative -top-0.5 ml-1.5 align-middle"
                  />
                )}
              </span>
            </div>
          )}
        </div>
      </div>
      {session.records.length > 0 && (
        <div className="relative sm:order-5 sm:col-span-4">
          <SessionRecordList records={session.records} toysById={toysById} unit={unit} />
        </div>
      )}
      {selected && mediaConfigured && (
        <div className="relative mt-3 sm:order-6 sm:col-span-4 sm:mt-1">
          <SessionMediaStrip sessionId={session.id} expectedCount={photoCount + videoCount} />
        </div>
      )}
    </div>
  );
}

export default memo(SessionRow);
