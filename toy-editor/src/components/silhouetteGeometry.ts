import {
  Shape,
  sectionBottomCurveAngle,
  sectionTopCurveAngle,
  type ToySection,
} from "../toyMachine";

export type SectionBodyGeometry = {
  x: number;
  d: string;
};

export const sectionBodyGeometry = (
  section: ToySection,
  scaleFactor: number,
  previousDiameter: number,
  totalWidth: number,
): SectionBodyGeometry => {
  const x = (totalWidth - Math.max(section.diameter, previousDiameter) * scaleFactor) / 2;
  const diameter = section.diameter * scaleFactor;
  const prevDiameter = previousDiameter * scaleFactor;
  const height = section.height * scaleFactor;

  const diffPrev = Math.max(0, diameter - prevDiameter) / 2;
  const diff = Math.max(0, prevDiameter - diameter) / 2;

  const m = height / 2;
  const θTop = (sectionTopCurveAngle(section) * Math.PI) / 180;
  const θBot = (sectionBottomCurveAngle(section) * Math.PI) / 180;
  const sinTop = Math.sin(θTop);
  const cosTop = Math.cos(θTop);
  const sinBot = Math.sin(θBot);
  const cosBot = Math.cos(θBot);

  const xTL = diffPrev;
  const xTR = prevDiameter + diffPrev;
  const xBL = diff;
  const xBR = diameter + diff;

  const cpTopLeftX = xTL - sinTop * m;
  const cpTopLeftY = cosTop * m;
  const cpTopRightX = xTR + sinTop * m;
  const cpTopRightY = cosTop * m;
  const cpBotLeftX = xBL - sinBot * m;
  const cpBotLeftY = height + cosBot * m;
  const cpBotRightX = xBR + sinBot * m;
  const cpBotRightY = height + cosBot * m;

  const d = [
    `M ${xTL} 0`,
    `C ${cpTopLeftX} ${cpTopLeftY} ${cpBotLeftX} ${cpBotLeftY} ${xBL} ${height}`,
    `L ${xBR} ${height}`,
    `C ${cpBotRightX} ${cpBotRightY} ${cpTopRightX} ${cpTopRightY} ${xTR} 0`,
  ].join(" ");

  return { x, d };
};

export type Orientation = "top" | "bottom";

type CapShapeInput = {
  diameter: number;
  baseY: number;
  apexY: number;
  openBase: boolean;
};

type ShapeRenderer = (g: CapShapeInput) => string;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const renderFlat: ShapeRenderer = ({ diameter, baseY, apexY }) =>
  `M 0 ${baseY} L ${diameter} ${baseY} L ${diameter} ${apexY} L 0 ${apexY} Z`;

const renderEgg: ShapeRenderer = ({ diameter, baseY, apexY, openBase }) => {
  const cpY = lerp(baseY, apexY, 4 / 3);
  const close = openBase ? "" : " Z";
  return `M 0 ${baseY} C 0 ${cpY} ${diameter} ${cpY} ${diameter} ${baseY}${close}`;
};

const renderCone: ShapeRenderer = ({ diameter, baseY, apexY, openBase }) => {
  const r = diameter / 2;
  const cpY = lerp(baseY, apexY, 4 / 3);
  const close = openBase ? "" : " Z";
  return `M 0 ${baseY} C ${r} ${cpY} ${r} ${cpY} ${diameter} ${baseY}${close}`;
};

const renderSpike: ShapeRenderer = ({ diameter, baseY, apexY, openBase }) => {
  const r = diameter / 2;
  const sideCpY = lerp(baseY, apexY, 0.15);
  const close = openBase ? "" : " Z";
  return (
    `M 0 ${baseY} ` +
    `C ${r * 0.4} ${sideCpY} ${r * 0.78} ${apexY} ${r} ${apexY} ` +
    `C ${r * 1.22} ${apexY} ${r * 1.6} ${sideCpY} ${diameter} ${baseY}${close}`
  );
};

const shapeRenderers: Record<Shape, ShapeRenderer> = {
  [Shape.FLAT]: renderFlat,
  [Shape.EGG]: renderEgg,
  [Shape.CONE]: renderCone,
  [Shape.SPIKE]: renderSpike,
};

export const capPath = (
  shape: Shape,
  orientation: Orientation,
  diameter: number,
  height: number,
  openAdjacentEdge: boolean,
): string => {
  const isTop = orientation === "top";
  return shapeRenderers[shape]({
    diameter,
    baseY: isTop ? height : 0,
    apexY: isTop ? 0 : height,
    openBase: !isTop && openAdjacentEdge,
  });
};

export type CapSectionGeometry = {
  x: number;
  d: string;
};

export const capSectionGeometry = (
  section: ToySection,
  shape: Shape,
  orientation: Orientation,
  scaleFactor: number,
  previousDiameter: number,
  totalWidth: number,
  hasAdjacent: boolean,
): CapSectionGeometry => {
  const capWidth = (orientation === "bottom" ? previousDiameter : section.diameter) * scaleFactor;
  const height = section.height * scaleFactor;
  return {
    x: (totalWidth - capWidth) / 2,
    d: capPath(shape, orientation, capWidth, height, hasAdjacent),
  };
};
