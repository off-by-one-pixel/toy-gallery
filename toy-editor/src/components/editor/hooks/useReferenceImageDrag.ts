import type { Dispatch, SetStateAction } from 'react';
import { referenceHeightMm, type ReferenceImage, resizedWidthMm } from '../referenceImage';
import type { EditorLayout } from './useEditorLayout';
import { type Point, usePointerDrag } from './usePointerDrag';

type ImageDragKind = 'move' | 'resize';

const grabAnchor = (image: ReferenceImage, kind: ImageDragKind) =>
  kind === 'move'
    ? { xMm: image.xMm, yMm: image.yMm }
    : { xMm: image.xMm + image.widthMm, yMm: image.yMm + referenceHeightMm(image) };

export const useReferenceImageDrag = (
  layout: EditorLayout,
  setImage: Dispatch<SetStateAction<ReferenceImage | null>>,
) => {
  const { silhouetteScale, silhouetteCenter, silhouetteY, freezeFrame, unfreezeFrame } = layout;

  const toMm = (point: Point) => ({
    xMm: (point.x - silhouetteCenter) / silhouetteScale,
    yMm: (point.y - silhouetteY) / silhouetteScale,
  });

  return usePointerDrag({
    begin: (point: Point, image: ReferenceImage, kind: ImageDragKind) => {
      const pointer = toMm(point);
      const anchor = grabAnchor(image, kind);
      return { kind, offsetXMm: pointer.xMm - anchor.xMm, offsetYMm: pointer.yMm - anchor.yMm };
    },
    move: (drag, point) => {
      const pointer = toMm(point);
      const xMm = pointer.xMm - drag.offsetXMm;
      const yMm = pointer.yMm - drag.offsetYMm;
      setImage((current) => {
        if (!current) return current;
        if (drag.kind === 'move') return { ...current, xMm, yMm };
        return { ...current, widthMm: resizedWidthMm(current, xMm, yMm) };
      });
    },
    onStart: freezeFrame,
    onEnd: unfreezeFrame,
  });
};

export type ReferenceImageDrag = ReturnType<typeof useReferenceImageDrag>;
