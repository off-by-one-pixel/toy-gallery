'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { SESSION_EDIT_ARROW_LABEL, SESSION_PEAK_CIRCUMFERENCE, SESSION_PEAK_LENGTH } from '../../labels';
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
  const orderedEntries = sortEntriesByInvolvement(session.entries);
  const visibleEntries = orderedEntries.slice(0, STRIP_LIMIT);
  const overflow = orderedEntries.length - visibleEntries.length;

  const scale = heightScale(orderedEntries.map((e) => toysById.get(e.toy)));

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md sm:grid sm:grid-cols-[180px_1fr_auto_auto] sm:items-center sm:gap-6 sm:px-6 sm:py-5">
      <div className="flex items-center justify-between gap-3 sm:contents">
        <div className="text-base font-semibold tracking-tight text-neutral-900 sm:order-1">
          {formatWhen(session.startedAt)}
        </div>
        <Link
          href={`/sessions/edit?id=${session.id}`}
          aria-label={SESSION_EDIT_ARROW_LABEL}
          className="rounded-md p-1 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-blue-600 sm:order-4"
        >
          <ChevronRight size={20} />
        </Link>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 sm:mt-0 sm:contents">
        <div className="flex flex-wrap items-center gap-3 sm:order-2">
          {visibleEntries.map((entry) => {
            const toy = toysById.get(entry.toy);
            return <MiniToy key={entry.toy} entry={entry} toy={toy} heightRatio={scale(toy)} />;
          })}
          {overflow > 0 && (
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
              +{overflow} more
            </span>
          )}
        </div>
        <div className="min-w-32 text-right shrink-0 sm:order-3">
          <PeakRow label={SESSION_PEAK_LENGTH} mm={session.maxInsertableLength} unit={unit} />
          <PeakRow label={SESSION_PEAK_CIRCUMFERENCE} mm={session.maxCircumference} unit={unit} />
        </div>
      </div>
    </div>
  );
}
