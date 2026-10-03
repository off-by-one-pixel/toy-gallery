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
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (drag.kind === "bottom") unfreezeScale();
      dragRef.current = null;
    },
    [unfreezeScale],
  );

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
