import type { CSSProperties, ReactNode, RefObject } from "react";

type Props = {
  ref?: RefObject<SVGSVGElement | null>;
  viewBox: string;
  preserveAspectRatio?: string;
  /** When true, the SVG is given explicit pixel width/height attributes
   *  (used by thumbnail consumers that want the SVG to size to its
   *  intrinsic content); when false, the SVG fills its container via
   *  CSS 100% / 100%. */
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
    ? { display: "block" }
    : { display: "block", width: "100%", height: "100%" };
  return (
    <svg
      ref={ref}
      className="cone-editor-svg"
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
