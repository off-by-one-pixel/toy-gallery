import type { RefObject } from "react";
import type { StyleOption, Toy } from "../toyMachine";
import Section from "./Section";
import TopSection from "./TopSection";

type Props = {
  toy: Toy;
  scaleFactor: number;
  style: StyleOption;
  ref?: RefObject<SVGSVGElement | null>;
};

export const Render = ({ toy, style, scaleFactor, ref }: Props) => {
  const totalHeight = toy.sections.reduce((a, b) => a + b.height, 0) * scaleFactor;
  const maxDiameter = Math.max(...toy.sections.map((s) => s.diameter), 0) * scaleFactor;
  let yOffset = 0;
  let previousDiameter = 0;
  let currentDiameter = 0;
  let previousHeight = 0;

  return (
    <svg
      ref={ref}
      width={maxDiameter}
      height={totalHeight}
      viewBox={`0 0 ${maxDiameter + style.borderWidth * 2} ${totalHeight}`}
      style={{ display: "block", margin: "20px auto" }}
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
            />
          ) : (
            <Section
              section={section}
              scaleFactor={scaleFactor}
              previousDiameter={previousDiameter}
              totalWidth={maxDiameter}
              style={style}
            />
          );
        return (
          <g key={section.id} transform={`translate(0, ${yOffset * scaleFactor})`}>
            {sectionElement}
          </g>
        );
      })}
    </svg>
  );
};

export default Render;
