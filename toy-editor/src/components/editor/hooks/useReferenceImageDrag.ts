import { type Dispatch, type PointerEvent as ReactPointerEvent, type SetStateAction, useCallback, useRef } from 'react';
import { localFromClient } from '../../../util/svgGeometry';
import { referenceHeightMm, type ReferenceImage, resizedWidthMm } from '../referenceImage';
import type { EditorLayout } from './useEditorLayout';

type ImageDragKind = 'move' | 'resize';

type ImageDrag = {
  kind: ImageDragKind;
  pointerId: number;
  offsetXMm: number;
  offsetYMm: number;
};

export type ReferenceImageHandlers = {
  onMovePointerDown: (e: ReactPointerEvent<SVGElement>) => void;
  onResizePointerDown: (e: ReactPointerEvent<SVGElement>) => void;
  onPointerMove: (e: ReactPointerEvent<SVGElement>) => void;
  onPointerUp: (e: ReactPointerEvent<SVGElement>) => void;
};

const grabAnchor = (image: ReferenceImage, kind: ImageDragKind) =>
  kind === 'move'
    ? { xMm: image.xMm, yMm: image.yMm }
    : { xMm: image.xMm + image.widthMm, yMm: image.yMm + referenceHeightMm(image) };

export const useReferenceImageDrag = (
  layout: EditorLayout,
  image: ReferenceImage | null,
  setImage: Dispatch<SetStateAction<ReferenceImage | null>>,
): ReferenceImageHandlers => {
  const dragRef = useRef<ImageDrag | null>(null);
  const { silhouetteScale, silhouetteCenter, silhouetteY, freezeFrame, unfreezeFrame } = layout;

  const pointerMm = useCallback(
    (e: ReactPointerEvent<SVGElement>) => {
      const local = localFromClient(e.currentTarget, e.clientX, e.clientY);
      if (!local) return null;
      return {
        xMm: (local.x - silhouetteCenter) / silhouetteScale,
        yMm: (local.y - silhouetteY) / silhouetteScale,
      };
    },
    [silhouetteCenter, silhouetteScale, silhouetteY],
  );

  const startDrag = useCallback(
    (e: ReactPointerEvent<SVGElement>, kind: ImageDragKind) => {
      const pointer = pointerMm(e);
      if (!image || !pointer) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const anchor = grabAnchor(image, kind);
      dragRef.current = {
        kind,
        pointerId: e.pointerId,
        offsetXMm: pointer.xMm - anchor.xMm,
        offsetYMm: pointer.yMm - anchor.yMm,
      };
      freezeFrame();
    },
    [image, pointerMm, freezeFrame],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<SVGElement>) => {
      const drag = dragRef.current;
      if (drag?.pointerId !== e.pointerId) return;
      const pointer = pointerMm(e);
      if (!pointer) return;
      const xMm = pointer.xMm - drag.offsetXMm;
      const yMm = pointer.yMm - drag.offsetYMm;
      setImage((current) => {
        if (!current) return current;
        if (drag.kind === 'move') return { ...current, xMm, yMm };
        return { ...current, widthMm: resizedWidthMm(current, xMm, yMm) };
      });
    },
    [pointerMm, setImage],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<SVGElement>) => {
      if (dragRef.current?.pointerId !== e.pointerId) return;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      dragRef.current = null;
      unfreezeFrame();
    },
    [unfreezeFrame],
  );

  return {
    onMovePointerDown: useCallback((e) => startDrag(e, 'move'), [startDrag]),
    onResizePointerDown: useCallback((e) => startDrag(e, 'resize'), [startDrag]),
    onPointerMove,
    onPointerUp,
  };
};
