'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ThumbnailRender } from 'toy-editor';

import type { Shape } from '@/api/types';
import SensitiveContent from '@/features/preferences/SensitiveContent';
import { toyShapeToEditor } from '@/features/toys/converters/toyShape';

const DEFAULT_FILL = '#c7e4ee';

type Background = 'gradient' | 'none';

type Props = Readonly<{
  shape: Shape;
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
  shape,
  fillColor,
  strokeColor = 'var(--silhouette-stroke)',
  borderWidth = 1.25,
  scaleFactor = 1,
  heightRatio = 1,
  background = 'gradient',
  insetTop = 8,
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
  const silhouetteStyle = { borderWidth, borderColor: strokeColor, color: fillColor || DEFAULT_FILL };
  return (
    <div className={`relative ${BG_CLASS[background]} ${className ?? ''}`}>
      <SensitiveContent className="absolute inset-0">
        <div className="absolute flex items-end justify-center" style={innerStyle}>
          <div className="flex h-full w-full filter-(--toy-fill-dim) items-end justify-center">
            <ThumbnailRender toy={toyShapeToEditor(shape)} scaleFactor={scaleFactor} style={silhouetteStyle} />
          </div>
        </div>
      </SensitiveContent>
      {children}
    </div>
  );
}
