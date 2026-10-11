import { Shape, type StyleOption, type Toy } from '../toyMachine';
import { buildSectionMeta, type SectionMeta } from './editor/layout';
import { capSectionGeometry, sectionBodyGeometry } from './silhouetteGeometry';

type Props = {
  sections: Toy['sections'];
  topShape: Shape;
  bottomShape: Shape;
  scaleFactor: number;
  maxDiameter: number;
  style: StyleOption;
  onHover?: (id: number | null) => void;
  interactive: boolean;
};

const partGeometry = (
  { section, previousDiameter, isFirst, isLast }: SectionMeta,
  { sections, topShape, bottomShape, scaleFactor, maxDiameter }: Props,
) => {
  if (isFirst) {
    const geometry = capSectionGeometry(
      section,
      topShape,
      'top',
      scaleFactor,
      previousDiameter,
      maxDiameter,
      sections.length > 1,
    );
    return { ...geometry, isCap: true };
  }
  if (isLast && bottomShape !== Shape.FLAT) {
    const geometry = capSectionGeometry(
      section,
      bottomShape,
      'bottom',
      scaleFactor,
      previousDiameter,
      maxDiameter,
      true,
    );
    return { ...geometry, isCap: true };
  }
  return { ...sectionBodyGeometry(section, scaleFactor, previousDiameter, maxDiameter), isCap: false };
};

const Silhouette = (props: Props) => {
  const { sections, scaleFactor, style, onHover, interactive } = props;
  return (
    <>
      {buildSectionMeta(sections).map((meta) => {
        const { section, topMm } = meta;
        const { x, d, isCap } = partGeometry(meta, props);
        const hover = isCap ? undefined : onHover;
        return (
          <g
            key={section.id}
            className={interactive ? 'toy-editor-part' : undefined}
            transform={`translate(${x}, ${topMm * scaleFactor})`}
            onMouseEnter={hover ? () => hover(section.id) : undefined}
            onMouseLeave={hover ? () => hover(null) : undefined}
          >
            <path
              d={d}
              fill={section.color || style.color}
              stroke={style.borderColor}
              strokeWidth={style.borderWidth}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </>
  );
};

export default Silhouette;
