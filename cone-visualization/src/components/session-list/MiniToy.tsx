'use client';

import { ThumbnailRender } from 'toy-editor';

import { SESSION_TOY_DELETED } from '../../labels';
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
  if (!toy) {
    return (
      <div className="flex w-20 flex-col items-center gap-1.5 text-center">
        <div className="h-14 w-10 rounded bg-neutral-200" />
        <div className="truncate text-xs text-neutral-400">{SESSION_TOY_DELETED}</div>
      </div>
    );
  }
  const editorToy = toyShapeToEditor(toy.shape);
  const isUsed = entry.involvement === Involvement.USED;
  const silhouetteStyle = {
    borderWidth: 1,
    borderColor: isUsed ? '#9ca3af' : '#1f2937',
    color: isUsed ? 'transparent' : toy.color || DEFAULT_FILL,
  };
  return (
    <div className="flex w-20 flex-col items-center gap-1.5 text-center" title={toyTooltip(toy)}>
      <div className="relative h-14 w-full">
        <div
          className="absolute inset-x-0 bottom-0 flex items-end justify-center"
          style={{ top: `${(1 - heightRatio) * 100}%`, ...STATE_FILTER_STYLE[entry.involvement] }}
        >
          <ThumbnailRender toy={editorToy} scaleFactor={0.18} style={silhouetteStyle} />
        </div>
      </div>
      <div className="max-w-20 truncate text-sm text-neutral-900">
        {toy.name}
        {toy.size && <span className="text-neutral-500"> {toy.size}</span>}
      </div>
    </div>
  );
}
