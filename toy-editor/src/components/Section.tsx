import React from 'react';
import { useToyStore } from '../toyMachine.js';

type Props = {
  useSectionStore: ReturnType<typeof useToyStore.getState>["sections"][number];
};


const Section: React.FC<Props> = ({ useSectionStore }) => {
  const section = useSectionStore();
  const { scaleFactor } = useToyStore(() => ({ scaleFactor: useToyStore.getState().scaleFactor }));
  const getPreviousDiameter = useToyStore((s) => s.getPreviousDiameter);
  const getXOffset = useToyStore((s) => s.getXOffset);

  const x = getXOffset(section.id) * scaleFactor;
  const diameter = section.diameter * scaleFactor;
  const prev_diameter = getPreviousDiameter(section.id) * scaleFactor;
  const height = section.height * scaleFactor;

  const diff_prev = Math.max(0, diameter - prev_diameter) / 2;
  const diff = Math.max(0, prev_diameter - diameter) / 2;


  return (
    <g transform={`translate(${x + 2}, 0)`}>
      <path
        d={`
          M ${0 + diff_prev} 0
          C ${0 + diff_prev} ${height / 2} ${0 + diff} ${height / 2} ${0 + diff} ${height} 
          L ${diameter + diff} ${height} 
          C ${diameter + diff} ${height / 2} ${prev_diameter + diff_prev} ${height / 2} ${prev_diameter + diff_prev} 0
        `}
        fill="lightblue"
        stroke="#000"
        strokeWidth="2"
      />
    </g>
  );
};

export default Section;