/** Convert a screen-space (clientX, clientY) point to the SVG viewBox-local
 *  coordinate system of the SVG that owns `target`. Returns null if the
 *  target isn't attached to an SVG or `getScreenCTM()` is unavailable. */
export const localFromClient = (
  target: SVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null => {
  const svg = target.ownerSVGElement;
  if (!svg) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const local = pt.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
};
