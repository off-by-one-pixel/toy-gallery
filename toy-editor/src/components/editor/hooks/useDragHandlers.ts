import { type PointerEvent as ReactPointerEvent, useCallback, useRef } from "react";
import { localFromClient } from "../../../util/svgGeometry";
import { snapToNearest } from "../../../util/sync";
import { useToyStore } from "../../../toyMachine";
import { type DragState, SNAP_THRESHOLD_MM } from "../layout";
import type { EditorLayout } from "./useEditorLayout";

export type DragHandlers = {
  onDiameterPointerDown: (
    e: ReactPointerEvent<SVGCircleElement>,
    sectionId: number,
    handleX: number,
  ) => void;
  onDiameterPointerMove: (e: ReactPointerEvent<SVGCircleElement>) => void;
  onBoundaryPointerDown: (
    e: ReactPointerEvent<SVGRectElement>,
    aboveId: number,
    boundaryMm: number,
  ) => void;
  onBoundaryPointerMove: (e: ReactPointerEvent<SVGRectElement>) => void;
  onBottomPointerDown: (
    e: ReactPointerEvent<SVGRectElement>,
    lastId: number,
    bottomMm: number,
    lastTopMm: number,
  ) => void;
  onBottomPointerMove: (e: ReactPointerEvent<SVGRectElement>) => void;
  onPointerUp: (e: ReactPointerEvent<SVGElement>) => void;
};

/** Encapsulates the three pointer-drag interactions on the canvas:
 *
 *  - **diameter**: drag the small handle on a section's bottom-right
 *    corner; the section border (not the cursor) tracks toward the
 *    pointer, snapping to the known size guide if enabled.
 *  - **boundary**: drag a band between two sections; redistributes
 *    height between the two adjacent sections via setBoundaryDelta,
 *    snapping to insertable / total guides if enabled.
 *  - **bottom**: drag the band at the bottom of the silhouette; grows
 *    or shrinks the last section's height. Freezes the silhouette
 *    scale on pointer-down (so the silhouette doesn't autoscale during
 *    the drag) and unfreezes on pointer-up.
 *
 *  All handlers preserve the cursor → border offset captured at
 *  pointer-down so snapping triggers on the section's resulting
 *  position rather than on the raw cursor location.
 */
export const useDragHandlers = (layout: EditorLayout): DragHandlers => {
  const setDiameter = useToyStore((s) => s.setDiameter);
  const setHeight = useToyStore((s) => s.setHeight);
  const setBoundaryDelta = useToyStore((s) => s.setBoundaryDelta);
  const insertableMm = useToyStore((s) => s.insertableLengthMm);
  const knownTotalMm = useToyStore((s) => s.knownTotalMm);
  const knownSizeMm = useToyStore((s) => s.knownSizeMm);
  const snapEnabled = useToyStore((s) => s.snapEnabled);
  const dragRef = useRef<DragState | null>(null);

  const { silhouetteScale, silhouetteCenter, silhouetteY, freezeScale, unfreezeScale } = layout;

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<SVGElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // capture may have been lost — ignore
      }
      if (drag.kind === "bottom") unfreezeScale();
      dragRef.current = null;
    },
    [unfreezeScale],
  );

  // ── diameter drag ──────────────────────────────────────────────────

  const onDiameterPointerDown = useCallback(
    (
      e: ReactPointerEvent<SVGCircleElement>,
      sectionId: number,
      handleX: number,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const local = localFromClient(e.currentTarget, e.clientX, e.clientY);
      const offsetPx = local ? local.x - handleX : 0;
      dragRef.current = { kind: "diameter", sectionId, pointerId: e.pointerId, offsetPx };
    },
    [],
  );

  const onDiameterPointerMove = useCallback(
    (e: ReactPointerEvent<SVGCircleElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.kind !== "diameter" || drag.pointerId !== e.pointerId) return;
      const local = localFromClient(e.currentTarget, e.clientX, e.clientY);
      if (!local) return;
      const desiredBorderX = local.x - drag.offsetPx;
      const radiusPx = Math.abs(desiredBorderX - silhouetteCenter);
      let mmDiameter = Math.max(1, (radiusPx * 2) / silhouetteScale);
      if (snapEnabled) {
        mmDiameter = snapToNearest(mmDiameter, [knownSizeMm], SNAP_THRESHOLD_MM);
      }
      setDiameter(drag.sectionId, mmDiameter);
    },
    [silhouetteCenter, silhouetteScale, snapEnabled, knownSizeMm, setDiameter],
  );

  // ── boundary drag ──────────────────────────────────────────────────

  const onBoundaryPointerDown = useCallback(
    (
      e: ReactPointerEvent<SVGRectElement>,
      aboveId: number,
      boundaryMm: number,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const local = localFromClient(e.currentTarget, e.clientX, e.clientY);
      const boundaryY = silhouetteY + boundaryMm * silhouetteScale;
      const offsetPx = local ? local.y - boundaryY : 0;
      dragRef.current = {
        kind: "boundary",
        aboveId,
        pointerId: e.pointerId,
        anchorBoundaryMm: boundaryMm,
        offsetPx,
      };
    },
    [silhouetteY, silhouetteScale],
  );

  const onBoundaryPointerMove = useCallback(
    (e: ReactPointerEvent<SVGRectElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.kind !== "boundary" || drag.pointerId !== e.pointerId) return;
      const local = localFromClient(e.currentTarget, e.clientX, e.clientY);
      if (!local) return;
      const desiredBorderY = local.y - drag.offsetPx;
      let newBoundaryMm = (desiredBorderY - silhouetteY) / silhouetteScale;
      if (snapEnabled) {
        newBoundaryMm = snapToNearest(
          newBoundaryMm,
          [insertableMm, knownTotalMm],
          SNAP_THRESHOLD_MM,
        );
      }
      const delta = newBoundaryMm - drag.anchorBoundaryMm;
      if (Math.abs(delta) < 1e-6) return;
      setBoundaryDelta(drag.aboveId, delta);
      dragRef.current = { ...drag, anchorBoundaryMm: newBoundaryMm };
    },
    [silhouetteY, silhouetteScale, snapEnabled, insertableMm, knownTotalMm, setBoundaryDelta],
  );

  // ── bottom drag ────────────────────────────────────────────────────

  const onBottomPointerDown = useCallback(
    (
      e: ReactPointerEvent<SVGRectElement>,
      lastId: number,
      bottomMm: number,
      lastTopMm: number,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const local = localFromClient(e.currentTarget, e.clientX, e.clientY);
      const bottomY = silhouetteY + bottomMm * silhouetteScale;
      const offsetPx = local ? local.y - bottomY : 0;
      dragRef.current = {
        kind: "bottom",
        lastId,
        pointerId: e.pointerId,
        offsetPx,
        lastTopMm,
      };
      freezeScale();
    },
    [silhouetteY, silhouetteScale, freezeScale],
  );

  const onBottomPointerMove = useCallback(
    (e: ReactPointerEvent<SVGRectElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.kind !== "bottom" || drag.pointerId !== e.pointerId) return;
      const local = localFromClient(e.currentTarget, e.clientX, e.clientY);
      if (!local) return;
      const desiredBorderY = local.y - drag.offsetPx;
      let newBottomMm = (desiredBorderY - silhouetteY) / silhouetteScale;
      if (snapEnabled) {
        newBottomMm = snapToNearest(
          newBottomMm,
          [knownTotalMm, insertableMm],
          SNAP_THRESHOLD_MM,
        );
      }
      const newLastHeight = Math.max(1, newBottomMm - drag.lastTopMm);
      setHeight(drag.lastId, newLastHeight);
    },
    [silhouetteY, silhouetteScale, snapEnabled, knownTotalMm, insertableMm, setHeight],
  );

  return {
    onDiameterPointerDown,
    onDiameterPointerMove,
    onBoundaryPointerDown,
    onBoundaryPointerMove,
    onBottomPointerDown,
    onBottomPointerMove,
    onPointerUp,
  };
};
