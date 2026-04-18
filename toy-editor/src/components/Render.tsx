import type { CSSProperties, RefObject } from "react";
import type { StyleOption, Toy } from "../toyMachine";
import Section from "./Section";
import TopSection from "./TopSection";

type Props = {
  toy: Toy;
  scaleFactor: number;
  style: StyleOption;
  ref?: RefObject<SVGSVGElement | null>;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  /**
   * When provided, the SVG has explicit pixel dimensions (useful for export /
   * sizing previews). When omitted, the SVG uses viewBox + CSS 100% so the
   * containing canvas can scale the silhouette to fit.
   */
  fixed?: boolean;
};

// Padding + selection-outline offsets are expressed as fractions of the
// toy's reference size so the silhouette occupies the same portion of the
// viewBox regardless of the numeric unit the values happen to be in.
const PAD_RATIO = 0.04;
const SELECTION_GAP_RATIO = 0.07;
const OUTLINE_EXTRA_RATIO = 0.02;
const CORNER_RADIUS_RATIO = 0.025;

export const Render = ({
  toy,
  style,
  scaleFactor,
  ref,
  selectedId = null,
  onSelect,
  fixed = false,
}: Props) => {
  const totalHeight = toy.sections.reduce((a, b) => a + b.height, 0) * scaleFactor;
  const maxDiameter = Math.max(...toy.sections.map((s) => s.diameter), 0) * scaleFactor;
  const ref_ = Math.max(maxDiameter, totalHeight, 1);
  const padX = ref_ * PAD_RATIO;
  const outlineInset = ref_ * SELECTION_GAP_RATIO;
  const outlinePad = outlineInset + ref_ * OUTLINE_EXTRA_RATIO;
  const cornerRadius = ref_ * CORNER_RADIUS_RATIO;
  const vbW = maxDiameter + padX + outlinePad * 2;
  const vbH = totalHeight + outlinePad * 2;
  let yOffset = 0;
  let previousDiameter = 0;
  let currentDiameter = 0;
  let previousHeight = 0;

  // Compute the selected section's bounding box so the overlay can be rendered
  // AFTER all sections (no z-index in SVG — last sibling wins).
  let selOverlay: { x: number; y: number; w: number; h: number } | null = null;
  if (selectedId != null) {
    const selIdx = toy.sections.findIndex((s) => s.id === selectedId);
    if (selIdx >= 0) {
      const section = toy.sections[selIdx];
      const prev = selIdx > 0 ? toy.sections[selIdx - 1] : null;
      const yMm = toy.sections.slice(0, selIdx).reduce((a, s) => a + s.height, 0);
      const boxWidth =
        (prev ? Math.max(section.diameter, prev.diameter) : section.diameter) * scaleFactor;
      const h = section.height * scaleFactor;
      const sectionX = (maxDiameter - boxWidth) / 2;
      selOverlay = { x: sectionX, y: yMm * scaleFactor, w: boxWidth, h };
    }
  }

  const widthAttr = fixed ? vbW : undefined;
  const heightAttr = fixed ? vbH : undefined;
  const svgStyle: CSSProperties = fixed
    ? { display: "block" }
    : { display: "block", width: "100%", height: "100%" };

  return (
    <svg
      ref={ref}
      className="cone-editor-svg"
      width={widthAttr}
      height={heightAttr}
      viewBox={`${-outlinePad} ${-outlinePad} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMax meet"
      style={svgStyle}
    >
      {toy.sections.map((section, index) => {
        yOffset += previousHeight;
        previousHeight = section.height;
        previousDiameter = currentDiameter;
        currentDiameter = section.diameter;
        const sectionElement =
          index === 0 ? (
            <TopSection
              section={section}
              scaleFactor={scaleFactor}
              totalWidth={maxDiameter}
              style={style}
              shape={toy.topShape}
              onSelect={onSelect}
            />
          ) : (
            <Section
              section={section}
              scaleFactor={scaleFactor}
              previousDiameter={previousDiameter}
              totalWidth={maxDiameter}
              style={style}
              onSelect={onSelect}
            />
          );
        return (
          <g key={section.id} transform={`translate(0, ${yOffset * scaleFactor})`}>
            {sectionElement}
          </g>
        );
      })}

      {selOverlay && (
        <g
          transform={`translate(${selOverlay.x}, ${selOverlay.y})`}
          pointerEvents="none"
        >
          <rect
            className="cone-editor-selection-tint"
            x={-outlineInset}
            y={-outlineInset}
            width={selOverlay.w + outlineInset * 2}
            height={selOverlay.h + outlineInset * 2}
            rx={cornerRadius}
          />
          <rect
            className="cone-editor-selection-outline"
            x={-outlineInset}
            y={-outlineInset}
            width={selOverlay.w + outlineInset * 2}
            height={selOverlay.h + outlineInset * 2}
            rx={cornerRadius}
          />
        </g>
      )}
    </svg>
  );
};

export default Render;
