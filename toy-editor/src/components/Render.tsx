import React from "react";
import { useToyStore } from "../toyMachine.js";
import Section from "./Section.js";

export const Render: React.FC<{}> = () => {
  const sections = useToyStore((s) => s.sections);
  const { scaleFactor, getTotalHeight, getMaxWidth, getYOffset } = useToyStore();

  const totalHeight = getTotalHeight() * scaleFactor;
  const maxDiameter = getMaxWidth() * scaleFactor;

  return (
    <svg
      width={maxDiameter}
      height={totalHeight}
      viewBox={`0 0 ${maxDiameter+4} ${totalHeight}`}
      style={{ display: 'block', margin: '20px auto' }}
    >
      {sections.map((useSectionStore, index) => {
        const section = useSectionStore();

        return (
          <g key={section.id} transform={`translate(0, ${getYOffset(section.id) * scaleFactor})`}>
            <Section useSectionStore={useSectionStore} />
          </g>
        );
      })}
    </svg>
  );
};