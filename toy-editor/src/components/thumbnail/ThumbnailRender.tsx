import type { StyleOption, Toy } from "../../toyMachine";
import Silhouette from "../Silhouette";
import SvgRoot from "../SvgRoot";

type Props = {
  toy: Toy;
  scaleFactor: number;
  style: StyleOption;
};

const ThumbnailRender = ({ toy, style, scaleFactor }: Props) => {
  const totalHeight = toy.sections.reduce((a, b) => a + b.height, 0) * scaleFactor;
  const maxDiameter = Math.max(...toy.sections.map((s) => s.diameter), 0) * scaleFactor;
  const vbW = Math.max(maxDiameter, 1);
  const vbH = Math.max(totalHeight, 1);

  return (
    <SvgRoot viewBox={`0 0 ${vbW} ${vbH}`}>
      <Silhouette
        sections={toy.sections}
        topShape={toy.topShape}
        bottomShape={toy.bottomShape}
        scaleFactor={scaleFactor}
        maxDiameter={maxDiameter}
        style={style}
        interactive={false}
      />
    </SvgRoot>
  );
};

export default ThumbnailRender;
