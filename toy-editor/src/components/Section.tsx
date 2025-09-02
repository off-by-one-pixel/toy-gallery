import React from "react";
import { StyleOption, ToySection } from "../toyMachine.js";

type Props = {
  section: ToySection;
  scaleFactor: number;
  previousDiameter: number;
  totalWidth: number;
  style: StyleOption;
};

const Section: React.FC<Props> = ({ section, scaleFactor, previousDiameter, totalWidth, style }) => {
  const x = (totalWidth - Math.max(section.diameter, previousDiameter) * scaleFactor) / 2;
  const diameter = section.diameter * scaleFactor;
  const prev_diameter = previousDiameter * scaleFactor;
  const height = section.height * scaleFactor;

  const diff_prev = Math.max(0, diameter - prev_diameter) / 2;
  const diff = Math.max(0, prev_diameter - diameter) / 2;

  return (
    <g transform={`translate(${x + style.borderWidth}, 0)`}>
      <path
        d={`
          M ${0 + diff_prev} 0
          C ${0 + diff_prev} ${height / 2} ${0 + diff} ${height / 2} ${0 + diff} ${height} 
          L ${diameter + diff} ${height} 
          C ${diameter + diff} ${height / 2} ${prev_diameter + diff_prev} ${height / 2} ${prev_diameter + diff_prev} 0
        `}
        fill={style.color}
        stroke={style.borderColor}
        strokeWidth={style.borderWidth}
      />
    </g>
  );
};

export default Section;
