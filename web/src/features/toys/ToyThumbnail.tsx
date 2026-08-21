'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { Toy as EditorToy } from 'toy-editor';

import SensitiveContent from '@/features/preferences/SensitiveContent';
import Silhouette from '@/features/toys/Silhouette';

type Background = 'gradient' | 'none';

type Props = Readonly<{
  toy: EditorToy;
  fillColor?: string | null;
  strokeColor?: string;
  borderWidth?: number;
  scaleFactor?: number;
  heightRatio?: number;
  background?: Background;
  insetTop?: number;
  insetBottom?: number;
  insetX?: number;
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
  insetTop = 0,
  insetBottom = 8,
  insetX = 0,
  className,
  filter,
  children,
}: Props) {
  const offset = (1 - heightRatio) * 100;
  const compensation = (1 - heightRatio) * (insetTop + insetBottom);
  const innerStyle: CSSProperties = {
    top: `calc(${insetTop}px + ${offset}% - ${compensation}px)`,
    bottom: `${insetBottom}px`,
    left: `${insetX}px`,
    right: `${insetX}px`,
    filter,
  };
  return (
    <div className={`relative ${BG_CLASS[background]} ${className ?? ''}`}>
      <SensitiveContent className="absolute inset-0">
        <div className="absolute flex items-end justify-center" style={innerStyle}>
          <Silhouette
            toy={toy}
            fillColor={fillColor}
            strokeColor={strokeColor}
            borderWidth={borderWidth}
            scaleFactor={scaleFactor}
          />
        </div>
      </SensitiveContent>
      {children}
    </div>
  );
}
