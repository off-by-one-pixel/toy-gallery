const ConeSection = ({ diameter, prev_diameter = 0, height, x = 0}) => {
  const diff_prev = Math.max(0, diameter - prev_diameter) / 2;
  const diff = Math.max(0,  prev_diameter - diameter) / 2;

  return (
    <g transform={`translate(${x}, 0)`}>
      <path
        d={`
          M ${0 + diff_prev} 0
          C ${0 + diff_prev } ${height/2} ${0 + diff } ${height/2} ${0 + diff } ${height} 
          L ${diameter + diff} ${height} 
          C ${diameter + diff} ${height/2} ${prev_diameter + diff_prev} ${height/2} ${prev_diameter + diff_prev} 0
        `}
        fill="lightblue"
        stroke="#000"
        strokeWidth="1"
      />
    </g>
  );
};

export default ConeSection;