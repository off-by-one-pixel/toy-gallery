import ConeSection from './ConeSection';
import ConeSectionTop from './ConeSectionTop';

const ToyRender = ({ sections }) => {
  const totalHeight = sections.reduce((sum, section) => sum + section.height, 0);
  const maxDiameter = Math.max(...sections.map(section => section.diameter));

  return (
    <svg
      width={maxDiameter}
      height={totalHeight}
      viewBox={`0 0 ${maxDiameter} ${totalHeight}`}
      style={{ display: 'block', margin: '20px auto' }}
    >
      {sections.map((section, index) => {
        const yOffset = sections
          .slice(0, index)
          .reduce((sum, s) => sum + s.height, 0);
        const prev_diameter = index > 0 ? sections[index - 1].diameter : section.diameter;
        
        return index === 0 ? (
          <g key={section.id} transform={`translate(0, ${yOffset})`}>
            <ConeSectionTop
              diameter={section.diameter}
              height={section.height}
              shape={section.shape}
              x={(maxDiameter - Math.max(section.diameter, prev_diameter)) / 2}
            />
          </g>
        ) : (
          <g key={section.id} transform={`translate(0, ${yOffset})`}>
            <ConeSection
              diameter={section.diameter}
              height={section.height}
              prev_diameter={prev_diameter}
              x={(maxDiameter - Math.max(section.diameter, prev_diameter)) / 2}
            />
          </g>
        );
      })}
    </svg>
  );
};

export default ToyRender;