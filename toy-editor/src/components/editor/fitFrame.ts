import { LABEL_WIDTH_PX, RULER_WIDTH_PX, VPAD_BOTTOM_PX, VPAD_TOP_PX } from "./layout";
import { referenceHeightMm, type ReferenceImage } from "./referenceImage";

export type Frame = { scale: number; silhouetteY: number };

type Size = { w: number; h: number };

export const availableArea = (size: Size) => ({
  w: Math.max(20, size.w - RULER_WIDTH_PX - LABEL_WIDTH_PX),
  h: Math.max(20, size.h - VPAD_TOP_PX - VPAD_BOTTOM_PX),
});

const scaleLimit = (spacePx: number, extentMm: number): number =>
  extentMm > 0 ? spacePx / extentMm : Infinity;

const imageScaleLimits = (size: Size, totalHeightMm: number, image: ReferenceImage): number[] => {
  const centerX = RULER_WIDTH_PX + availableArea(size).w / 2;
  const topMm = image.yMm;
  const bottomMm = image.yMm + referenceHeightMm(image);
  return [
    scaleLimit(centerX, -image.xMm),
    scaleLimit(size.w - centerX, image.xMm + image.widthMm),
    scaleLimit(size.h - VPAD_TOP_PX, bottomMm),
    scaleLimit(size.h - VPAD_BOTTOM_PX, totalHeightMm - topMm),
    scaleLimit(size.h, bottomMm - topMm),
  ];
};

export const fitFrame = (
  size: Size,
  totalHeightMm: number,
  maxDiameterMm: number,
  image: ReferenceImage | null,
): Frame => {
  const avail = availableArea(size);
  const fitted = Math.min(
    scaleLimit(avail.h, totalHeightMm),
    scaleLimit(avail.w, maxDiameterMm),
    ...(image ? imageScaleLimits(size, totalHeightMm, image) : []),
  );
  const scale = Number.isFinite(fitted) ? fitted : 1;
  const silhouetteY = Math.max(VPAD_TOP_PX, image ? -image.yMm * scale : 0);
  return { scale, silhouetteY };
};
