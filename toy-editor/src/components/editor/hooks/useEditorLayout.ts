import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Toy } from "../../../toyMachine";
import {
  buildSectionMeta,
  DIAMETER_LABEL_GAP_PX,
  HEIGHT_LABEL_GAP_PX,
  LABEL_INPUT_W_PX,
  RULER_WIDTH_PX,
  type SectionMeta,
} from "../layout";
import { availableArea, fitFrame, type Frame } from "../fitFrame";
import type { ReferenceImage } from "../referenceImage";

export type EditorLayout = {
  ref: React.RefObject<SVGSVGElement | null>;
  size: { w: number; h: number };
  silhouetteScale: number;
  silhouetteX: number;
  silhouetteY: number;
  silhouetteW: number;
  silhouetteH: number;
  silhouetteCenter: number;
  totalHeightMm: number;
  maxDiameterMm: number;
  sectionMeta: SectionMeta[];
  heightLabelX: number;
  diameterLabelX: number;
  ready: boolean;
  freezeFrame: () => void;
  unfreezeFrame: () => void;
};

export const useEditorLayout = (
  toy: Toy,
  referenceImage: ReferenceImage | null,
): EditorLayout => {
  const ref = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [frozenFrame, setFrozenFrame] = useState<Frame | null>(null);

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

  const availW = availableArea(size).w;
  const frame = frozenFrame ?? fitFrame(size, totalHeightMm, maxDiameterMm, referenceImage);
  const silhouetteScale = frame.scale;
  const silhouetteY = frame.silhouetteY;
  const silhouetteW = maxDiameterMm * silhouetteScale;
  const silhouetteH = totalHeightMm * silhouetteScale;
  const silhouetteX = RULER_WIDTH_PX + (availW - silhouetteW) / 2;
  const silhouetteCenter = silhouetteX + silhouetteW / 2;

  const sectionMeta = useMemo(
    () => buildSectionMeta(toy.sections),
    [toy.sections],
  );

  const heightLabelX = Math.max(
    4,
    silhouetteX - HEIGHT_LABEL_GAP_PX - LABEL_INPUT_W_PX,
  );
  const diameterLabelX = silhouetteX + silhouetteW + DIAMETER_LABEL_GAP_PX;

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
    heightLabelX,
    diameterLabelX,
    ready: size.w > 0 && size.h > 0,
    freezeFrame: useCallback(
      () => setFrozenFrame({ scale: silhouetteScale, silhouetteY }),
      [silhouetteScale, silhouetteY],
    ),
    unfreezeFrame: useCallback(() => setFrozenFrame(null), []),
  };
};
