'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

import { useGirth } from '../../providers/GirthProvider';
import { displayGirth } from '../../services/girth';
import { heightScale } from '../../services/scaling';
import { formatWhen, sortEntriesByInvolvement } from '../../services/session';
import type { Session, Toy } from '../../services/types';
import { type Unit } from '../../services/units';
import MiniToy from './MiniToy';
import PeakRow from './PeakRow';

const STRIP_LIMIT = 5;

type Props = Readonly<{
  session: Session;
  toysById: Map<number, Toy>;
  unit: Unit;
}>;

export default function SessionRow({ session, toysById, unit }: Props) {
  const t = useTranslations('session');
  const locale = useLocale();
  const { girth } = useGirth();
  const whenT = (key: 'today' | 'yesterday') => t(key);

  const orderedEntries = sortEntriesByInvolvement(session.entries);
  const visibleEntries = orderedEntries.slice(0, STRIP_LIMIT);
  const overflow = orderedEntries.length - visibleEntries.length;

  const scale = heightScale(orderedEntries.map((e) => toysById.get(e.toy)));

  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4 shadow-sm transition-shadow hover:shadow-md sm:grid sm:grid-cols-[180px_1fr_auto_auto] sm:items-center sm:gap-6 sm:px-6 sm:py-5">
      <div className="flex items-center justify-between gap-3 sm:contents">
        <div className="text-base font-semibold tracking-tight text-foreground sm:order-1">
          {formatWhen(session.startedAt, new Date(), locale, whenT)}
        </div>
        <Link
          href={`/sessions/edit?id=${session.id}`}
          aria-label={t('editArrowLabel')}
          className="rounded-md p-1 text-text-subtle transition-colors hover:bg-surface-secondary hover:text-accent sm:order-4"
        >
          <ChevronRight size={20} />
        </Link>
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
    </div>
  );
}
