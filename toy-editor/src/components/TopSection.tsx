import React from "react";
import { ToySection } from "../toyMachine.js";

type Props = {
  section: ToySection;
  scaleFactor: number;
  shape: string;
  borderWidth: number;
  totalWidth: number;
};

const TopSection: React.FC<Props> = ({ section, scaleFactor, shape, borderWidth, totalWidth }) => {
  const diameter = section.diameter * scaleFactor;
  const height = section.height * scaleFactor;

  const isEgg = shape === 'egg';
  const radius = diameter / 2;
  let x1, x2;

  if (isEgg) {
    x1 = 0;
    x2 = diameter;
  } else {
    x1 = radius;
    x2 = radius;
  }
  return (
    <g transform={`translate(${(totalWidth - diameter) / 2 + borderWidth}, 0)`}>
      <path
        d={`
          M 0 ${height}
          C ${x1} 0 ${x2} 0 ${diameter} ${height}
          Z
        `}
        fill="lightblue"
        stroke="#000"
        strokeWidth={borderWidth}
      />
    </g>
  );
};

export default TopSection;
