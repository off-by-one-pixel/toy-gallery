import ConeSection from './ConeSection';
import ConeSectionTop from './ConeSectionTop';

const ToyRender = ({ sections, scaleFactor=1 }) => {
  const totalHeight = sections.reduce((sum, section) => sum + section.height, 0) * scaleFactor;
  const maxDiameter = Math.max(...sections.map(section => section.diameter)) * scaleFactor;
  return (
    <svg
      width={maxDiameter}
      height={totalHeight}
      viewBox={`0 0 ${maxDiameter+4} ${totalHeight}`}
      style={{ display: 'block', margin: '20px auto' }}
    >
      {sections.map((section, index) => {
        const yOffset = sections
          .slice(0, index)
          .reduce((sum, s) => sum + s.height, 0) * scaleFactor;
        const prev_diameter = index > 0 ? sections[index - 1].diameter : section.diameter;
        
        return index === 0 ? (
          <g key={section.id} transform={`translate(0, ${yOffset})`}>
            <ConeSectionTop
              diameter={section.diameter}
              height={section.height}
              shape={section.shape}
              scaleFactor={scaleFactor}
              x={(maxDiameter - Math.max(section.diameter, prev_diameter) * scaleFactor) / 2 }
            />
          </g>
        ) : (
          <g key={section.id} transform={`translate(0, ${yOffset})`}>
            <ConeSection
              diameter={section.diameter}
              height={section.height}
              prev_diameter={prev_diameter}
              scaleFactor={scaleFactor}
              x={(maxDiameter - Math.max(section.diameter, prev_diameter) * scaleFactor) / 2}
            />
          </g>
        );
      })}
    </svg>
  );
};

export default ToyRender;