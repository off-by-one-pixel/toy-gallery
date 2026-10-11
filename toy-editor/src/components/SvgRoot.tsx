import type { ReactNode, RefObject } from 'react';

type Props = {
  ref?: RefObject<SVGSVGElement | null>;
  viewBox: string;
  preserveAspectRatio?: string;
  children: ReactNode;
};

const SvgRoot = ({ ref, viewBox, preserveAspectRatio = 'xMidYMax meet', children }: Props) => (
  <svg
    ref={ref}
    className="toy-editor-svg"
    viewBox={viewBox}
    preserveAspectRatio={preserveAspectRatio}
    style={{ display: 'block', overflow: 'visible', width: '100%', height: '100%' }}
  >
    {children}
  </svg>
);

export default SvgRoot;
