import { Shape, type StyleOption, type Toy } from "../toyMachine";
import CapSection from "./CapSection";
import Section from "./Section";

type Props = {
  sections: Toy["sections"];
  topShape: Shape;
  bottomShape: Shape;
  scaleFactor: number;
  maxDiameter: number;
  style: StyleOption;
  onSelect?: (id: number) => void;
  interactive: boolean;
};

/** Renders the toy's silhouette as a stack of section / cap shapes.
 *  Shared by the editor and thumbnail render modes — purely
 *  presentational, no behaviour. */
const Silhouette = ({
  sections,
  topShape,
  bottomShape,
  scaleFactor,
  maxDiameter,
  style,
  onSelect,
  interactive,
}: Props) => {
  let yOffset = 0;
  let previousHeight = 0;
  let currentDiameter = 0;
  let previousDiameter = 0;
  return (
    <>
      {sections.map((section, index) => {
        yOffset += previousHeight;
        previousHeight = section.height;
        previousDiameter = currentDiameter;
        currentDiameter = section.diameter;
        const isFirst = index === 0;
        const isLast = index === sections.length - 1 && !isFirst;
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
              onSelect={onSelect}
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
              onSelect={onSelect}
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
              onSelect={onSelect}
              interactive={interactive}
            />
          );
        }
        return (
          <g key={section.id} transform={`translate(0, ${yOffset * scaleFactor})`}>
            {element}
          </g>
        );
      })}
    </>
  );
};

export default Silhouette;
