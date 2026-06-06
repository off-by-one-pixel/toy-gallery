'use client';

import { useTranslations } from 'next-intl';
import { ThumbnailRender } from 'toy-editor';

import { toyShapeToEditor } from '../../services/converters/toyShape';
import { toyTooltip } from '../../services/session';
import { Involvement, type SessionEntry, type Toy } from '../../services/types';

const STATE_FILTER_STYLE: Record<Involvement, React.CSSProperties> = {
  [Involvement.USED]: {},
  [Involvement.INSERTED]: { filter: 'saturate(0.35) opacity(0.5)' },
  [Involvement.FULLY_INSERTED]: {},
};

const DEFAULT_FILL = '#c7e4ee';

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
  const silhouetteStyle = {
    borderWidth: 1,
    borderColor: isUsed ? 'var(--muted)' : 'var(--silhouette-stroke)',
    color: isUsed ? 'transparent' : toy.color || DEFAULT_FILL,
  };
  return (
    <div className="flex w-20 flex-col items-center gap-1.5 text-center" title={toyTooltip(toy)}>
      <div className="relative h-14 w-full">
        <div
          className="absolute inset-x-0 bottom-0 flex items-end justify-center"
          style={{ top: `${(1 - heightRatio) * 100}%`, ...STATE_FILTER_STYLE[entry.involvement] }}
        >
          <div className="flex h-full w-full items-end justify-center" style={{ filter: 'var(--toy-fill-dim)' }}>
            <ThumbnailRender toy={editorToy} scaleFactor={0.18} style={silhouetteStyle} />
          </div>
        </div>
      </div>
      <div className="max-w-20 truncate text-sm text-foreground">
        {toy.name}
        {toy.size && <span className="text-muted"> {toy.size}</span>}
      </div>
    </div>
  );
}
