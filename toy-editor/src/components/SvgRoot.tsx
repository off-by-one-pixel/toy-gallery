import type { CSSProperties, ReactNode, RefObject } from "react";

type Props = {
  ref?: RefObject<SVGSVGElement | null>;
  viewBox: string;
  preserveAspectRatio?: string;
  fixed?: boolean;
  width?: number;
  height?: number;
  children: ReactNode;
};

const SvgRoot = ({
  ref,
  viewBox,
  preserveAspectRatio = "xMidYMax meet",
  fixed,
  width,
  height,
  children,
}: Props) => {
  const style: CSSProperties = fixed
    ? { display: "block", overflow: "visible" }
    : { display: "block", overflow: "visible", width: "100%", height: "100%" };
  return (
    <svg
      ref={ref}
      className="toy-editor-svg"
      width={width}
      height={height}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      style={style}
    >
      {children}
    </svg>
  );
};

export default SvgRoot;
