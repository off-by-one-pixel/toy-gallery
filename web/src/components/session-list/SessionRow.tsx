'use client';

import { Image as ImageIcon, Pencil, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ActionButtons, type ActionDef } from '@/components/ActionButtons';
import { useGirth } from '@/providers/GirthProvider';
import { displayGirth } from '@/services/girth';
import { formatDuration, totalDuration } from '@/services/duration';
import { heightScale } from '@/services/scaling';
import { formatWhen } from '@/services/dates';
import { sortEntriesByInvolvement } from '@/services/session';
import type { Session, Toy } from '@/services/types';
import { type Unit } from '@/services/units';
import MiniToy from './MiniToy';
import PeakRow from './PeakRow';
import SessionMediaStrip from './SessionMediaStrip';

const STRIP_LIMIT = 5;

type Props = Readonly<{
  session: Session;
  toysById: Map<number, Toy>;
  unit: Unit;
  hasMedia: boolean;
  selected: boolean;
  flash?: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}>;

export default function SessionRow({
  session,
  toysById,
  unit,
  hasMedia,
  selected,
  flash = false,
  onToggleSelect,
  onEdit,
  onDelete,
}: Props) {
  const t = useTranslations('session');
  const common = useTranslations('common');
  const locale = useLocale();
  const { girth } = useGirth();
  const whenT = (key: 'today' | 'yesterday') => t(key);

  const selectionRing = session.isLive ? 'ring-2 ring-emerald-500 ' : 'ring-2 ring-accent ';
  const orderedEntries = sortEntriesByInvolvement(session.entries);
  const visibleEntries = selected ? orderedEntries : orderedEntries.slice(0, STRIP_LIMIT);
  const overflow = orderedEntries.length - visibleEntries.length;

  const scale = heightScale(orderedEntries.map((e) => toysById.get(e.toy)));
  const totalMinutes = totalDuration(orderedEntries);

  const actions: ActionDef[] = [
    { key: 'edit', label: common('edit'), icon: Pencil, variant: 'outline', onPress: onEdit },
    { key: 'delete', label: common('delete'), icon: Trash2, variant: 'danger-soft', onPress: onDelete },
  ];

  return (
    <div
      className={
        'group relative rounded-xl border bg-surface px-5 py-4 shadow-sm transition-shadow hover:shadow-md sm:grid sm:grid-cols-[180px_1fr_auto_auto] sm:items-center sm:gap-6 sm:px-6 sm:py-5 ' +
        (session.isLive ? 'border-emerald-500 ' : 'border-border ') +
        (selected ? selectionRing : '') +
        (flash ? 'row-flash' : '')
      }
    >
      <button
        type="button"
        aria-label={t('detailsToggleLabel')}
        aria-expanded={selected}
        onClick={onToggleSelect}
        className="absolute inset-0 cursor-pointer rounded-xl"
      />
      <div className="flex items-center justify-between gap-3 sm:contents">
        <div className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-foreground sm:order-1">
          {formatWhen(session.startedAt, new Date(), locale, whenT)}
          {session.isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              {t('live.badge')}
            </span>
          )}
          {hasMedia && (
            <span
              aria-label={t('media.indicatorLabel')}
              title={t('media.indicatorLabel')}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-soft-foreground"
            >
              <ImageIcon size={13} strokeWidth={2} />
            </span>
          )}
        </div>
        <div className="relative hidden gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 sm:order-4 sm:flex">
          <ActionButtons actions={actions} stopPropagation />
        </div>
      </div>
      <div className="mt-3 sm:mt-0 sm:contents">
        <div className="flex flex-wrap items-center gap-3 sm:order-2">
          {visibleEntries.map((entry) => {
            const toy = toysById.get(entry.toy);
            return <MiniToy key={entry.toy} entry={entry} toy={toy} heightRatio={scale(toy)} />;
          })}
          {overflow > 0 && (
            <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-medium text-muted">
              {t('overflowMore', { count: overflow })}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-5 border-t border-border pt-2.5 sm:order-3 sm:mt-0 sm:block sm:min-w-32 sm:shrink-0 sm:border-t-0 sm:pt-0 sm:text-right">
          <PeakRow label={t('peakLength')} mm={session.maxInsertableLength} unit={unit} />
          <PeakRow
            label={girth === 'diameter' ? t('peakDiameter') : t('peakCircumference')}
            mm={displayGirth(session.maxCircumference, girth)}
            unit={unit}
          />
          {totalMinutes > 0 && (
            <div className="flex items-baseline gap-2 py-0.5 sm:justify-end">
              <span className="text-caption uppercase tracking-wider text-text-tertiary">{t('totalTime')}</span>
              <span className="text-[15px] font-semibold tracking-tight tabular-nums text-foreground sm:text-[17px]">
                {formatDuration(totalMinutes, locale)}
              </span>
            </div>
          )}
        </div>
      </div>
      {selected && (
        <div className="relative mt-3 sm:order-5 sm:col-span-4 sm:mt-1">
          <SessionMediaStrip sessionId={session.id} />
        </div>
      )}
    </div>
  );
}
