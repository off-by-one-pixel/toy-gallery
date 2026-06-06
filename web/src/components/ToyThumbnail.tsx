'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { Toy as EditorToy } from 'toy-editor';

import Silhouette from './Silhouette';

type Background = 'gradient' | 'none';

type Props = Readonly<{
  toy: EditorToy;
  fillColor?: string | null;
  strokeColor?: string;
  borderWidth?: number;
  scaleFactor?: number;
  heightRatio?: number;
  background?: Background;
  className?: string;
  filter?: string;
  children?: ReactNode;
}>;

const BG_CLASS: Record<Background, string> = {
  gradient: 'bg-linear-to-br from-(--thumbnail-tile-from) to-(--thumbnail-tile-to)',
  none: '',
};

export default function ToyThumbnail({
  toy,
  fillColor,
  strokeColor,
  borderWidth,
  scaleFactor,
  heightRatio = 1,
  background = 'gradient',
  className,
  filter,
  children,
}: Props) {
  const innerStyle: CSSProperties = {
    top: `${(1 - heightRatio) * 100}%`,
    filter,
  };
  return (
    <div className={`relative ${BG_CLASS[background]} ${className ?? ''}`}>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center" style={innerStyle}>
        <Silhouette
          toy={toy}
          fillColor={fillColor}
          strokeColor={strokeColor}
          borderWidth={borderWidth}
          scaleFactor={scaleFactor}
        />
      </div>
      {children}
    </div>
  );
}
