import { Shape, type StyleOption, type Toy } from "../toyMachine";
import CapSection from "./CapSection";
import { buildSectionMeta } from "./editor/layout";
import Section from "./Section";

type Props = {
  sections: Toy["sections"];
  topShape: Shape;
  bottomShape: Shape;
  scaleFactor: number;
  maxDiameter: number;
  style: StyleOption;
  onHover?: (id: number | null) => void;
  interactive: boolean;
};

const Silhouette = ({
  sections,
  topShape,
  bottomShape,
  scaleFactor,
  maxDiameter,
  style,
  onHover,
  interactive,
}: Props) => {
  return (
    <>
      {buildSectionMeta(sections).map(({ section, topMm, previousDiameter, isFirst, isLast }) => {
        const renderAsBottomCap = isLast && bottomShape !== Shape.FLAT;
        let element;
        if (isFirst) {
          element = (
            <CapSection
              section={section}
              scaleFactor={scaleFactor}
              totalWidth={maxDiameter}
              style={style}
              shape={topShape}
              orientation="top"
              hasAdjacent={sections.length > 1}
              interactive={interactive}
            />
          );
        } else if (renderAsBottomCap) {
          element = (
            <CapSection
              section={section}
              scaleFactor={scaleFactor}
              previousDiameter={previousDiameter}
              totalWidth={maxDiameter}
              style={style}
              shape={bottomShape}
              orientation="bottom"
              hasAdjacent
              interactive={interactive}
            />
          );
        } else {
          element = (
            <Section
              section={section}
              scaleFactor={scaleFactor}
              previousDiameter={previousDiameter}
              totalWidth={maxDiameter}
              style={style}
              onHover={onHover}
              interactive={interactive}
            />
          );
        }
        return (
          <g key={section.id} transform={`translate(0, ${topMm * scaleFactor})`}>
            {element}
          </g>
        );
      })}
    </>
  );
};

export default Silhouette;
