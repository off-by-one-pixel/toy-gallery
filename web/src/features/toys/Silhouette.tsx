'use client';

import { ThumbnailRender } from 'toy-editor';
import type { Toy as EditorToy } from 'toy-editor';

const DEFAULT_FILL = '#c7e4ee';

type Props = Readonly<{
  toy: EditorToy;
  fillColor?: string | null;
  strokeColor?: string;
  borderWidth?: number;
  scaleFactor?: number;
  dim?: boolean;
}>;

export default function Silhouette({
  toy,
  fillColor,
  strokeColor = 'var(--silhouette-stroke)',
  borderWidth = 1.25,
  scaleFactor = 1,
  dim = true,
}: Props) {
  const style = {
    borderWidth,
    borderColor: strokeColor,
    color: fillColor || DEFAULT_FILL,
  };
  return (
    <div
      className="flex h-full w-full items-end justify-center"
      style={dim ? { filter: 'var(--toy-fill-dim)' } : undefined}
    >
      <ThumbnailRender toy={toy} scaleFactor={scaleFactor} style={style} />
    </div>
  );
}
