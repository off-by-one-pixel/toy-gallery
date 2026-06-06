'use client';

import { useTranslations } from 'next-intl';

import { toyShapeToEditor } from '../../services/converters/toyShape';
import { toyTooltip } from '../../services/session';
import { Involvement, type SessionEntry, type Toy } from '../../services/types';
import ToyThumbnail from '../ToyThumbnail';

const STATE_FILTER: Record<Involvement, string | undefined> = {
  [Involvement.USED]: undefined,
  [Involvement.INSERTED]: 'saturate(0.35) opacity(0.5)',
  [Involvement.FULLY_INSERTED]: undefined,
};

type Props = Readonly<{
  entry: SessionEntry;
  toy: Toy | undefined;
  heightRatio: number;
}>;

export default function MiniToy({ entry, toy, heightRatio }: Props) {
  const t = useTranslations('session');
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
    <div className="flex w-20 flex-col items-center gap-1.5 text-center" title={toyTooltip(toy)}>
      <ToyThumbnail
        toy={editorToy}
        fillColor={isUsed ? 'transparent' : toy.color}
        strokeColor={isUsed ? 'var(--muted)' : undefined}
        borderWidth={1}
        scaleFactor={0.18}
        heightRatio={heightRatio}
        background="none"
        filter={STATE_FILTER[entry.involvement]}
        className="h-14 w-full"
      />
      <div className="max-w-20 truncate text-sm text-foreground">
        {toy.name}
        {toy.size && <span className="text-muted"> {toy.size}</span>}
      </div>
    </div>
  );
}
