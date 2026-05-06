import type { RefObject } from "react";
import type { StyleOption, Toy } from "../../toyMachine";
import Silhouette from "../Silhouette";
import SvgRoot from "../SvgRoot";

type Props = {
  toy: Toy;
  scaleFactor: number;
  style: StyleOption;
  ref?: RefObject<SVGSVGElement | null>;
  fixed?: boolean;
};

/** Padding + selection-outline offsets are fractions of the toy's
 *  reference size so the silhouette occupies the same portion of the
 *  viewBox regardless of the unit the values are in. */
const PAD_RATIO = 0.04;
const STROKE_ALLOWANCE_RATIO = 0.02;

/** Read-only render mode used by thumbnail consumers (cards, lists,
 *  chip pickers, session lists). Carries forward the previous
 *  viewBox-scaled rendering so existing consumers see pixel-identical
 *  output. */
const ThumbnailRender = ({ toy, style, scaleFactor, ref, fixed = false }: Props) => {
  const totalHeight = toy.sections.reduce((a, b) => a + b.height, 0) * scaleFactor;
  const maxDiameter = Math.max(...toy.sections.map((s) => s.diameter), 0) * scaleFactor;
  const refSize = Math.max(maxDiameter, totalHeight, 1);
  const padX = refSize * PAD_RATIO;
  const strokeAllowance = refSize * STROKE_ALLOWANCE_RATIO;
  const vbW = maxDiameter + padX * 2;
  const vbH = totalHeight + strokeAllowance * 2;

  return (
    <SvgRoot
      ref={ref}
      viewBox={`${-padX} ${-strokeAllowance} ${vbW} ${vbH}`}
      fixed={fixed}
      width={fixed ? vbW : undefined}
      height={fixed ? vbH : undefined}
    >
      <Silhouette
        sections={toy.sections}
        topShape={toy.topShape}
        bottomShape={toy.bottomShape}
        scaleFactor={scaleFactor}
        maxDiameter={maxDiameter}
        style={style}
        interactive={false}
      />
    </SvgRoot>
  );
};

export default ThumbnailRender;
