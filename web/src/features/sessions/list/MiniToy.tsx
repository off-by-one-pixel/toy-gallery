'use client';

import { useLocale, useTranslations } from 'next-intl';

import { toyShapeToEditor } from '@/features/toys/converters/toyShape';
import { formatElapsed } from '@/lib/duration';
import { toyTooltip } from '@/features/sessions/session';
import { Involvement, type SessionEntry, type Toy } from '@/api/types';
import RecordTrophy from '@/features/sessions/list/RecordTrophy';
import ToyThumbnail from '@/features/toys/ToyThumbnail';

const STATE_FILTER: Record<Involvement, string | undefined> = {
  [Involvement.USED]: undefined,
  [Involvement.INSERTED]: 'saturate(0.35) opacity(0.5)',
  [Involvement.FULLY_INSERTED]: undefined,
};

type Props = Readonly<{
  entry: SessionEntry;
  toy: Toy | undefined;
  heightRatio: number;
  recordLabels?: readonly string[];
}>;

export default function MiniToy({ entry, toy, heightRatio, recordLabels = [] }: Props) {
  const t = useTranslations('session');
  const locale = useLocale();
  if (!toy) {
    return (
      <div className="flex w-20 flex-col items-center gap-1.5 text-center">
        <div className="h-14 w-10 rounded bg-surface-tertiary" />
        <div className="truncate text-xs text-text-tertiary">{t('toyDeleted')}</div>
      </div>
    );
  }
  const editorToy = toyShapeToEditor(toy.shape);
  const isUsed = entry.involvement === Involvement.USED;
  return (
    <div className="relative flex w-20 flex-col items-center gap-1.5 text-center" title={toyTooltip(toy)}>
      {recordLabels.length > 0 && (
        <RecordTrophy
          label={recordLabels.join('\n')}
          count={recordLabels.length}
          className="absolute -top-1 right-1 z-10"
        />
      )}
      <ToyThumbnail
        toy={editorToy}
        fillColor={isUsed ? 'transparent' : toy.color}
        strokeColor={isUsed ? 'var(--muted)' : undefined}
        borderWidth={1}
        scaleFactor={0.18}
        heightRatio={heightRatio}
        background="none"
        insetTop={0}
        insetBottom={0}
        filter={STATE_FILTER[entry.involvement]}
        className="h-14 w-full"
      />
      <div className="max-w-20 truncate text-sm text-foreground">
        {toy.name}
        {toy.size && <span className="text-muted"> {toy.size}</span>}
      </div>
      {entry.durationMinutes != null && (
        <div className="text-xs tabular-nums text-muted">{formatElapsed(entry.durationMinutes, locale)}</div>
      )}
    </div>
  );
}
