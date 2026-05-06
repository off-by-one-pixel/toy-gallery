import { useEffect, useMemo, useRef, useState } from "react";
import type { Toy } from "../../../toyMachine";
import {
  buildSectionMeta,
  LABEL_WIDTH_PX,
  RULER_WIDTH_PX,
  type SectionMeta,
  VPAD_BOTTOM_PX,
  VPAD_TOP_PX,
} from "../layout";

export type EditorLayout = {
  /** Attach to the `<svg>` root so the hook can observe its size. */
  ref: React.RefObject<SVGSVGElement | null>;
  /** Last-observed pixel size of the SVG element. */
  size: { w: number; h: number };
  /** mm → px scale used for the silhouette. Frozen during a bottom drag,
   *  otherwise tracks the live fit. */
  silhouetteScale: number;
  silhouetteX: number;
  silhouetteY: number;
  silhouetteW: number;
  silhouetteH: number;
  silhouetteCenter: number;
  totalHeightMm: number;
  maxDiameterMm: number;
  sectionMeta: SectionMeta[];
  /** True once the SVG has been measured at least once. */
  ready: boolean;
  /** Freeze the silhouette scale at its current value. Used by the
   *  bottom-edge drag to prevent autoscale during the drag. */
  freezeScale: () => void;
  /** Release the freeze; the silhouette goes back to fitting the
   *  available area. */
  unfreezeScale: () => void;
};

/** Owns the SVG ref + ResizeObserver + frozen-scale state, and derives
 *  every layout value the editor chrome needs from the toy and the
 *  current container size. */
export const useEditorLayout = (toy: Toy): EditorLayout => {
  const ref = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [frozenScale, setFrozenScale] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totalHeightMm = toy.sections.reduce((a, b) => a + b.height, 0);
  const maxDiameterMm = Math.max(...toy.sections.map((s) => s.diameter), 0);

  const availW = Math.max(20, size.w - RULER_WIDTH_PX - LABEL_WIDTH_PX);
  const availH = Math.max(20, size.h - VPAD_TOP_PX - VPAD_BOTTOM_PX);
  const fitScale =
    totalHeightMm > 0 && maxDiameterMm > 0
      ? Math.min(availH / totalHeightMm, availW / maxDiameterMm)
      : 1;
  const silhouetteScale = frozenScale ?? fitScale;
  const silhouetteW = maxDiameterMm * silhouetteScale;
  const silhouetteH = totalHeightMm * silhouetteScale;
  const silhouetteX = RULER_WIDTH_PX + (availW - silhouetteW) / 2;
  const silhouetteY = VPAD_TOP_PX;
  const silhouetteCenter = silhouetteX + silhouetteW / 2;

  const sectionMeta = useMemo(
    () => buildSectionMeta(toy.sections),
    [toy.sections],
  );

  return {
    ref,
    size,
    silhouetteScale,
    silhouetteX,
    silhouetteY,
    silhouetteW,
    silhouetteH,
    silhouetteCenter,
    totalHeightMm,
    maxDiameterMm,
    sectionMeta,
    ready: size.w > 0 && size.h > 0,
    freezeScale: () => setFrozenScale(silhouetteScale),
    unfreezeScale: () => setFrozenScale(null),
  };
};
