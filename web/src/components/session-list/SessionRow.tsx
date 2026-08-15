'use client';

import { useRef } from 'react';
import { Image as ImageIcon, Pencil, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ActionButtons, type ActionDef } from '../ActionButtons';
import { useGirth } from '../../providers/GirthProvider';
import { displayGirth } from '../../services/girth';
import { heightScale } from '../../services/scaling';
import { formatWhen, sortEntriesByInvolvement } from '../../services/session';
import type { Session, Toy } from '../../services/types';
import { type Unit } from '../../services/units';
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
  onToggleSelect,
  onEdit,
  onDelete,
}: Props) {
  const t = useTranslations('session');
  const common = useTranslations('common');
  const locale = useLocale();
  const { girth } = useGirth();
  const mediaRef = useRef<HTMLDivElement>(null);
  const whenT = (key: 'today' | 'yesterday') => t(key);

  const toggleUnlessInMedia = (target: EventTarget) => {
    if (mediaRef.current?.contains(target as Node)) return;
    onToggleSelect();
  };

  const orderedEntries = sortEntriesByInvolvement(session.entries);
  const visibleEntries = selected ? orderedEntries : orderedEntries.slice(0, STRIP_LIMIT);
  const overflow = orderedEntries.length - visibleEntries.length;

  const scale = heightScale(orderedEntries.map((e) => toysById.get(e.toy)));

  const actions: ActionDef[] = [
    { key: 'edit', label: common('edit'), icon: Pencil, variant: 'outline', onPress: onEdit },
    { key: 'delete', label: common('delete'), icon: Trash2, variant: 'danger-soft', onPress: onDelete },
  ];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => toggleUnlessInMedia(e.target)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleSelect();
        }
      }}
      className={
        'group cursor-pointer rounded-xl border border-border bg-surface px-5 py-4 shadow-sm transition-shadow hover:shadow-md sm:grid sm:grid-cols-[180px_1fr_auto_auto] sm:items-center sm:gap-6 sm:px-6 sm:py-5 ' +
        (selected ? 'ring-2 ring-accent' : '')
      }
    >
      <div className="flex items-center justify-between gap-3 sm:contents">
        <div className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-foreground sm:order-1">
          {formatWhen(session.startedAt, new Date(), locale, whenT)}
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
        <div className="hidden gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 sm:order-4 sm:flex">
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
        </div>
      </div>
      {selected && (
        <div ref={mediaRef} className="mt-3 sm:order-5 sm:col-span-4 sm:mt-1">
          <SessionMediaStrip sessionId={session.id} />
        </div>
      )}
    </div>
  );
}
