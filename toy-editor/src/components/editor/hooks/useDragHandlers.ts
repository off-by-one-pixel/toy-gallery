import { useToyStore } from '../../../toyMachine';
import { snapToNearest } from '../../../util/sync';
import { type SectionMeta, SNAP_THRESHOLD_MM } from '../layout';
import type { EditorLayout } from './useEditorLayout';
import { type Point, usePointerDrag } from './usePointerDrag';

export const useDragHandlers = (layout: EditorLayout) => {
  const setDiameter = useToyStore((s) => s.setDiameter);
  const setHeight = useToyStore((s) => s.setHeight);
  const insertableMm = useToyStore((s) => s.insertableLengthMm);
  const knownTotalMm = useToyStore((s) => s.knownTotalMm);
  const knownSizeMm = useToyStore((s) => s.knownSizeMm);
  const snapEnabled = useToyStore((s) => s.snapEnabled);

  const { sectionMeta, silhouetteScale, silhouetteCenter, silhouetteY, freezeFrame, unfreezeFrame } = layout;

  const snap = (mm: number, guides: (number | null)[]) =>
    snapEnabled ? snapToNearest(mm, guides, SNAP_THRESHOLD_MM) : mm;

  const diameter = usePointerDrag({
    begin: (point: Point, sectionId: number, handleX: number) => ({ sectionId, offsetPx: point.x - handleX }),
    move: ({ sectionId, offsetPx }, point) => {
      const radiusPx = Math.abs(point.x - offsetPx - silhouetteCenter);
      setDiameter(sectionId, snap(Math.max(1, (radiusPx * 2) / silhouetteScale), [knownSizeMm]));
    },
  });

  const boundary = usePointerDrag({
    begin: (point: Point, above: SectionMeta) => ({
      above,
      below: sectionMeta.at(above.index + 1),
      offsetPx: point.y - (silhouetteY + above.bottomMm * silhouetteScale),
    }),
    move: ({ above, below, offsetPx }, point) => {
      const pointerMm = (point.y - offsetPx - silhouetteY) / silhouetteScale;
      const floorMm = below ? below.bottomMm - 1 : Infinity;
      const boundaryMm = Math.max(Math.min(snap(pointerMm, [insertableMm, knownTotalMm]), floorMm), above.topMm + 1);
      setHeight(above.section.id, boundaryMm - above.topMm);
      if (below) setHeight(below.section.id, below.bottomMm - boundaryMm);
    },
    onStart: freezeFrame,
    onEnd: unfreezeFrame,
  });

  return { diameter, boundary };
};

export type DragHandlers = ReturnType<typeof useDragHandlers>;
