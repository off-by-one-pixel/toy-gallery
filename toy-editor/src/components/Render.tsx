import React from "react";
import { Toy } from "../toyMachine.js";
import Section from "./Section.js";
import TopSection from "./TopSection.js";

type Props = {
  toy: Toy;
  scaleFactor: number;
};

export const Render: React.FC<Props> = ({ toy, scaleFactor }) => {
  const borderWidth = 2;
  const totalHeight = toy.sections.reduce((a, b) => a + b.height, 0) * scaleFactor;
  const maxDiameter = Math.max(...toy.sections.map((s) => s.diameter), 0) * scaleFactor;
  let yOffset = 0;
  let previousDiameter = 0;
  let currentDiameter = 0;
  let previousHeight = 0;

  return (
    <svg
      width={maxDiameter}
      height={totalHeight}
      viewBox={`0 0 ${maxDiameter + 4} ${totalHeight}`}
      style={{ display: 'block', margin: '20px auto' }}
    >
      {toy.sections.map((section, index) => {
        yOffset += previousHeight;
        previousHeight = section.height;
        previousDiameter = currentDiameter;
        currentDiameter = section.diameter;
        const sectionElement = (index === 0) ? (
          <TopSection
            section={section}
            scaleFactor={scaleFactor}
            borderWidth={borderWidth}
            totalWidth={maxDiameter}
            shape={toy.topShape} />
        ) : (
          <Section
            section={section}
            scaleFactor={scaleFactor}
            previousDiameter={previousDiameter}
            totalWidth={maxDiameter}
            borderWidth={borderWidth}
          />
        );
        return (
          <g key={section.id} transform={`translate(0, ${yOffset * scaleFactor})`}> {sectionElement}</g>
        );
      })}
    </svg>
  );
};

export default Render;