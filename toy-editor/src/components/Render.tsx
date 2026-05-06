import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Shape, type StyleOption, type Toy, useToyStore } from "../toyMachine";
import CapSection from "./CapSection";
import Section from "./Section";
import { type Unit, useEditorUnit } from "./unit";

/** Format a canonical mm value in the editor's display unit, e.g.
 *  `42.5 mm` or `4.25 cm`. */
const fmtUnit = (mm: number, unit: Unit): string =>
  `${(mm / unit.factor).toFixed(unit.decimals)} ${unit.id}`;
const fmtUnitNum = (mm: number, unit: Unit): string =>
  (mm / unit.factor).toFixed(unit.decimals);

type Props = {
  toy: Toy;
  scaleFactor: number;
  style: StyleOption;
  ref?: RefObject<SVGSVGElement | null>;
  /**
   * @deprecated Selection outline rendering was removed; this prop is kept
   * for API stability but no longer affects the visual output.
   */
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  /** When provided, the SVG has explicit pixel dimensions. */
  fixed?: boolean;
  /**
   * When true (default), the editor chrome is drawn — ruler, reference
   * guides, floating inputs, drag handles, remove buttons. When false the
   * silhouette renders alone (used by thumbnail consumers).
   */
  interactive?: boolean;
};

export const Render = (props: Props) => {
  if (props.interactive === false) return <ThumbnailRender {...props} />;
  return <EditorRender {...props} />;
};

export default Render;

// ─── Thumbnail mode (preview/cards/lists) ────────────────────────────────────
//
// Carries forward the previous viewBox-scaled rendering so existing
// thumbnail consumers (ToyCard, ToyList, ToyChipSelector, SessionList) get
// pixel-identical output to before.

const PAD_RATIO = 0.04;

const ThumbnailRender = ({ toy, style, scaleFactor, ref, fixed = false }: Props) => {
  const totalHeight = toy.sections.reduce((a, b) => a + b.height, 0) * scaleFactor;
  const maxDiameter = Math.max(...toy.sections.map((s) => s.diameter), 0) * scaleFactor;
  const ref_ = Math.max(maxDiameter, totalHeight, 1);
  const padX = ref_ * PAD_RATIO;
  const strokeAllowance = ref_ * 0.02;
  const vbW = maxDiameter + padX * 2;
  const vbH = totalHeight + strokeAllowance * 2;

  return (
    <SvgRoot
      ref={ref}
      viewBox={`${-padX} ${-strokeAllowance} ${vbW} ${vbH}`}
      fixed={fixed}
      width={fixed ? vbW : undefined}
      height={fixed ? vbH : undefined}
    >
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

// ─── Editor mode (the silhouette + ruler + guides + floating labels) ─────────
//
// We render with a viewBox sized to the actual on-screen pixel dimensions of
// the SVG element. That means 1 viewBox unit == 1 CSS pixel, so:
//   - the silhouette is positioned in pixel coordinates derived from a fit
//     scale (mm → px) that we recompute on resize, and
//   - UI elements (ruler, drag handles, text, foreignObject inputs) use
//     fixed pixel sizes that don't grow or shrink as the toy size changes.

/** Reserved space outside the silhouette on each side. The right side
 *  carries two inputs per section (diameter + circumference) plus the ×
 *  button; the left only needs the ruler + one input. We pad both sides
 *  to the same width so the silhouette stays centered in the canvas. */
const RULER_WIDTH_PX = 240;
const LABEL_WIDTH_PX = 240;
/** Horizontal gap between the diameter input and the circumference input. */
const CIRC_LABEL_GAP_PX = 8;
/** Horizontal gap between the silhouette's edge and the input column.
 *  Drives how long each leader's horizontal arm is. Same on both sides. */
const DIAMETER_LABEL_GAP_PX = 36;
const HEIGHT_LABEL_GAP_PX = 36;
/** Fixed horizontal position for the overall-length ruler axis, anchored
 *  to the left edge of the canvas (independent of the silhouette layout)
 *  so it sits clearly apart from the per-section height brackets. */
const RULER_AXIS_X_PX = 40;
/** Vertical padding inside the SVG. The top must clear the topmost diameter
 *  label's input box (at section midpoint − LABEL_INPUT_H_PX / 2) so it
 *  doesn't get clipped by the viewBox top. The bottom must fit the total
 *  readout AND the bottom section's diameter input, which is rendered just
 *  below the silhouette rather than at the section midpoint. */
const VPAD_TOP_PX = 28;
const VPAD_BOTTOM_PX = 56;
const HANDLE_R_PX = 5;
const REMOVE_R_PX = 9;
const LABEL_INPUT_W_PX = 74;
const LABEL_INPUT_H_PX = 22;
const SNAP_THRESHOLD_MM = 2;

type DragState =
  | {
      kind: "diameter";
      sectionId: number;
      pointerId: number;
      /** Cursor x − handle x at pointer-down. Subtracted on each move so
       *  the section border (not the cursor) tracks where the user grabbed. */
      offsetPx: number;
    }
  | {
      kind: "boundary";
      aboveId: number;
      pointerId: number;
      anchorBoundaryMm: number;
      offsetPx: number;
    }
  | {
      kind: "bottom";
      lastId: number;
      pointerId: number;
      offsetPx: number;
      lastTopMm: number;
    };

const EditorRender = ({ toy, style, ref, onSelect }: Props) => {
  const localRef = useRef<SVGSVGElement | null>(null);
  useImperativeHandle(ref, () => localRef.current as SVGSVGElement, []);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  // Set during a bottom-edge drag so the silhouette scale stays put while
  // the user resizes — only on release does it relax to fit again.
  const [frozenScale, setFrozenScale] = useState<number | null>(null);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totalHeightMm = toy.sections.reduce((a, b) => a + b.height, 0);
  const maxDiameterMm = Math.max(...toy.sections.map((s) => s.diameter), 0);

  // Layout: derive a px-per-mm scale that fits the silhouette into the
  // available area between the reserved ruler / label columns and the
  // top/bottom padding.
  const availW = Math.max(20, size.w - RULER_WIDTH_PX - LABEL_WIDTH_PX);
  const availH = Math.max(20, size.h - VPAD_TOP_PX - VPAD_BOTTOM_PX);
  const fitScale =
    totalHeightMm > 0 && maxDiameterMm > 0
      ? Math.min(availH / totalHeightMm, availW / maxDiameterMm)
      : 1;
  const silhouetteScale = frozenScale ?? fitScale;
  const silhouetteW = maxDiameterMm * silhouetteScale;
  const silhouetteH = totalHeightMm * silhouetteScale;
  const silhouetteX = RULER_WIDTH_PX + (availW - silhouetteW) / 2;
  const silhouetteY = VPAD_TOP_PX;
  const silhouetteCenter = silhouetteX + silhouetteW / 2;

  // Per-section meta: pixel y of top/bottom/mid + the canonical mm anchors.
  const sectionMeta = useMemo<SectionMeta[]>(() => {
    let yMm = 0;
    return toy.sections.map((section, index) => {
      const topMm = yMm;
      const bottomMm = topMm + section.height;
      yMm = bottomMm;
      const prev = index > 0 ? toy.sections[index - 1] : null;
      const previousDiameter = prev ? prev.diameter : 0;
      const isFirst = index === 0;
      const isLast = index === toy.sections.length - 1 && !isFirst;
      return {
        section,
        index,
        topMm,
        bottomMm,
        midMm: (topMm + bottomMm) / 2,
        previousDiameter,
        isFirst,
        isLast,
      };
    });
  }, [toy.sections]);

  const ready = size.w > 0 && size.h > 0;

  return (
    <SvgRoot ref={localRef} viewBox={`0 0 ${size.w || 1} ${size.h || 1}`} preserveAspectRatio="none">
      {ready && (
        <>
          <Guides
            insertableMm={toy.insertableLengthMm ?? null}
            knownTotalMm={toy.knownTotalMm ?? null}
            knownSizeMm={toy.knownSizeMm ?? null}
            silhouetteScale={silhouetteScale}
            silhouetteY={silhouetteY}
            silhouetteH={silhouetteH}
            silhouetteCenter={silhouetteCenter}
            xLeft={Math.max(8, RULER_WIDTH_PX - 60)}
            xRight={size.w - 8}
          />

          <g transform={`translate(${silhouetteX}, ${silhouetteY})`}>
            <Silhouette
              sections={toy.sections}
              topShape={toy.topShape}
              bottomShape={toy.bottomShape}
              scaleFactor={silhouetteScale}
              maxDiameter={silhouetteW}
              style={style}
              onSelect={onSelect}
              interactive
            />
          </g>

          <EditorChrome
            sections={sectionMeta}
            silhouetteScale={silhouetteScale}
            silhouetteCenter={silhouetteCenter}
            silhouetteX={silhouetteX}
            silhouetteY={silhouetteY}
            silhouetteW={silhouetteW}
            silhouetteH={silhouetteH}
            totalHeightMm={totalHeightMm}
            maxDiameterMm={maxDiameterMm}
            bottomShape={toy.bottomShape}
            sizeMode={toy.sizeDisplayMode ?? "diameter"}
            rulerAxisX={RULER_AXIS_X_PX}
            heightLabelX={Math.max(
              4,
              silhouetteX - HEIGHT_LABEL_GAP_PX - LABEL_INPUT_W_PX,
            )}
            diameterLabelX={silhouetteX + silhouetteW + DIAMETER_LABEL_GAP_PX}
            onBottomDragStart={() => setFrozenScale(silhouetteScale)}
            onBottomDragEnd={() => setFrozenScale(null)}
          />
        </>
      )}
    </SvgRoot>
  );
};

// ─── SvgRoot ────────────────────────────────────────────────────────────────

type SvgRootProps = {
  ref?: RefObject<SVGSVGElement | null>;
  viewBox: string;
  preserveAspectRatio?: string;
  fixed?: boolean;
  width?: number;
  height?: number;
  children: React.ReactNode;
};

const SvgRoot = ({
  ref,
  viewBox,
  preserveAspectRatio = "xMidYMax meet",
  fixed,
  width,
  height,
  children,
}: SvgRootProps) => {
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

// ─── Silhouette ──────────────────────────────────────────────────────────────

type SilhouetteProps = {
  sections: Toy["sections"];
  topShape: Shape;
  bottomShape: Shape;
  scaleFactor: number;
  maxDiameter: number;
  style: StyleOption;
  onSelect?: (id: number) => void;
  interactive: boolean;
};

const Silhouette = ({
  sections,
  topShape,
  bottomShape,
  scaleFactor,
  maxDiameter,
  style,
  onSelect,
  interactive,
}: SilhouetteProps) => {
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

// ─── Guides ──────────────────────────────────────────────────────────────────

type GuidesProps = {
  insertableMm: number | null;
  knownTotalMm: number | null;
  knownSizeMm: number | null;
  silhouetteScale: number;
  silhouetteY: number;
  silhouetteH: number;
  silhouetteCenter: number;
  xLeft: number;
  xRight: number;
};

const Guides = ({
  insertableMm,
  knownTotalMm,
  knownSizeMm,
  silhouetteScale,
  silhouetteY,
  silhouetteH,
  silhouetteCenter,
  xLeft,
  xRight,
}: GuidesProps) => {
  const unit = useEditorUnit();
  return (
    <g className="cone-editor-guides" pointerEvents="none">
      {insertableMm != null && insertableMm >= 0 && (
        <HorizontalGuide
          y={silhouetteY + insertableMm * silhouetteScale}
          xLeft={xLeft}
          xRight={xRight}
          label={`insertable ${fmtUnit(insertableMm, unit)}`}
        />
      )}
      {knownTotalMm != null && knownTotalMm >= 0 && (
        <HorizontalGuide
          y={silhouetteY + knownTotalMm * silhouetteScale}
          xLeft={xLeft}
          xRight={xRight}
          label={`total ${fmtUnit(knownTotalMm, unit)}`}
        />
      )}
      {knownSizeMm != null && knownSizeMm > 0 && (() => {
        const half = (knownSizeMm * silhouetteScale) / 2;
        const yTop = silhouetteY - 8;
        const yBot = silhouetteY + silhouetteH + 12;
        // The label shows the diameter the guide represents, regardless of
        // how the user typed the value into the toy-level Circumference
        // field — the geometry of the guide is the diameter at center ± d/2.
        return (
          <>
            <line
              className="cone-editor-guide"
              x1={silhouetteCenter - half}
              x2={silhouetteCenter - half}
              y1={yTop}
              y2={yBot}
            />
            <line
              className="cone-editor-guide"
              x1={silhouetteCenter + half}
              x2={silhouetteCenter + half}
              y1={yTop}
              y2={yBot}
            />
            <text
              className="cone-editor-guide-label"
              x={silhouetteCenter}
              y={yTop - 2}
              textAnchor="middle"
            >
              Ø {fmtUnit(knownSizeMm, unit)}
            </text>
          </>
        );
      })()}
    </g>
  );
};

const HorizontalGuide = ({
  y,
  xLeft,
  xRight,
  label,
}: {
  y: number;
  xLeft: number;
  xRight: number;
  label: string;
}) => (
  <>
    <line className="cone-editor-guide" x1={xLeft} x2={xRight} y1={y} y2={y} />
    <text
      className="cone-editor-guide-label"
      x={xRight}
      y={y - 4}
      textAnchor="end"
    >
      {label}
    </text>
  </>
);

// ─── EditorChrome (ruler + drag handles + floating inputs + remove buttons) ─

type SectionMeta = {
  section: Toy["sections"][number];
  index: number;
  topMm: number;
  bottomMm: number;
  midMm: number;
  previousDiameter: number;
  isFirst: boolean;
  isLast: boolean;
};

type EditorChromeProps = {
  sections: SectionMeta[];
  silhouetteScale: number;
  silhouetteCenter: number;
  silhouetteX: number;
  silhouetteY: number;
  silhouetteW: number;
  silhouetteH: number;
  totalHeightMm: number;
  maxDiameterMm: number;
  bottomShape: Shape;
  sizeMode: "diameter" | "circumference";
  rulerAxisX: number;
  heightLabelX: number;
  diameterLabelX: number;
  onBottomDragStart: () => void;
  onBottomDragEnd: () => void;
};

const EditorChrome = ({
  sections,
  silhouetteScale,
  silhouetteCenter,
  silhouetteX,
  silhouetteY,
  silhouetteW,
  silhouetteH,
  totalHeightMm,
  maxDiameterMm,
  bottomShape,
  sizeMode,
  rulerAxisX,
  heightLabelX,
  diameterLabelX,
  onBottomDragStart,
  onBottomDragEnd,
}: EditorChromeProps) => {
  const setDiameter = useToyStore((s) => s.setDiameter);
  const setCircumference = useToyStore((s) => s.setCircumference);
  const setKnownSize = useToyStore((s) => s.setKnownSize);
  const setBoundaryDelta = useToyStore((s) => s.setBoundaryDelta);
  const removeSection = useToyStore((s) => s.removeSection);
  const insertableMm = useToyStore((s) => s.insertableLengthMm);
  const knownTotalMm = useToyStore((s) => s.knownTotalMm);
  const knownSizeMm = useToyStore((s) => s.knownSizeMm);
  const snapEnabled = useToyStore((s) => s.snapEnabled);
  const sectionsLen = sections.length;

  const dragRef = useRef<DragState | null>(null);

  const localFromClient = useCallback(
    (target: SVGElement, clientX: number, clientY: number) => {
      const svg = target.ownerSVGElement;
      if (!svg) return null;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const local = pt.matrixTransform(ctm.inverse());
      return { x: local.x, y: local.y };
    },
    [],
  );

  const setHeight = useToyStore((s) => s.setHeight);

  const onDiameterPointerDown = (
    e: ReactPointerEvent<SVGCircleElement>,
    sectionId: number,
    handleX: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const local = localFromClient(e.currentTarget, e.clientX, e.clientY);
    const offsetPx = local ? local.x - handleX : 0;
    dragRef.current = { kind: "diameter", sectionId, pointerId: e.pointerId, offsetPx };
  };

  const onDiameterPointerMove = (e: ReactPointerEvent<SVGCircleElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.kind !== "diameter" || drag.pointerId !== e.pointerId) return;
    const local = localFromClient(e.currentTarget, e.clientX, e.clientY);
    if (!local) return;
    const desiredBorderX = local.x - drag.offsetPx;
    const radiusPx = Math.abs(desiredBorderX - silhouetteCenter);
    let mmDiameter = Math.max(1, (radiusPx * 2) / silhouetteScale);
    if (
      snapEnabled &&
      knownSizeMm != null &&
      Math.abs(mmDiameter - knownSizeMm) < SNAP_THRESHOLD_MM
    ) {
      mmDiameter = knownSizeMm;
    }
    setDiameter(drag.sectionId, mmDiameter);
  };

  const onPointerUp = (e: ReactPointerEvent<SVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // capture may have been lost — ignore
    }
    if (drag.kind === "bottom") onBottomDragEnd();
    dragRef.current = null;
  };

  const onBoundaryPointerDown = (
    e: ReactPointerEvent<SVGRectElement>,
    aboveId: number,
    boundaryMm: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const local = localFromClient(e.currentTarget, e.clientX, e.clientY);
    const boundaryY = silhouetteY + boundaryMm * silhouetteScale;
    const offsetPx = local ? local.y - boundaryY : 0;
    dragRef.current = {
      kind: "boundary",
      aboveId,
      pointerId: e.pointerId,
      anchorBoundaryMm: boundaryMm,
      offsetPx,
    };
  };

  const onBoundaryPointerMove = (e: ReactPointerEvent<SVGRectElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.kind !== "boundary" || drag.pointerId !== e.pointerId) return;
    const local = localFromClient(e.currentTarget, e.clientX, e.clientY);
    if (!local) return;
    const desiredBorderY = local.y - drag.offsetPx;
    let newBoundaryMm = (desiredBorderY - silhouetteY) / silhouetteScale;
    if (snapEnabled) {
      if (
        insertableMm != null &&
        Math.abs(newBoundaryMm - insertableMm) < SNAP_THRESHOLD_MM
      ) {
        newBoundaryMm = insertableMm;
      } else if (
        knownTotalMm != null &&
        Math.abs(newBoundaryMm - knownTotalMm) < SNAP_THRESHOLD_MM
      ) {
        newBoundaryMm = knownTotalMm;
      }
    }
    const delta = newBoundaryMm - drag.anchorBoundaryMm;
    if (Math.abs(delta) < 1e-6) return;
    setBoundaryDelta(drag.aboveId, delta);
    dragRef.current = { ...drag, anchorBoundaryMm: newBoundaryMm };
  };

  const onBottomPointerDown = (
    e: ReactPointerEvent<SVGRectElement>,
    lastId: number,
    bottomMm: number,
    lastTopMm: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const local = localFromClient(e.currentTarget, e.clientX, e.clientY);
    const bottomY = silhouetteY + bottomMm * silhouetteScale;
    const offsetPx = local ? local.y - bottomY : 0;
    dragRef.current = {
      kind: "bottom",
      lastId,
      pointerId: e.pointerId,
      offsetPx,
      lastTopMm,
    };
    onBottomDragStart();
  };

  const onBottomPointerMove = (e: ReactPointerEvent<SVGRectElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.kind !== "bottom" || drag.pointerId !== e.pointerId) return;
    const local = localFromClient(e.currentTarget, e.clientX, e.clientY);
    if (!local) return;
    const desiredBorderY = local.y - drag.offsetPx;
    let newBottomMm = (desiredBorderY - silhouetteY) / silhouetteScale;
    if (snapEnabled) {
      if (
        knownTotalMm != null &&
        Math.abs(newBottomMm - knownTotalMm) < SNAP_THRESHOLD_MM
      ) {
        newBottomMm = knownTotalMm;
      } else if (
        insertableMm != null &&
        Math.abs(newBottomMm - insertableMm) < SNAP_THRESHOLD_MM
      ) {
        newBottomMm = insertableMm;
      }
    }
    const newLastHeight = Math.max(1, newBottomMm - drag.lastTopMm);
    setHeight(drag.lastId, newLastHeight);
  };

  return (
    <>
      {/* The overall-length ruler (axis + tick marks + mm labels) and the
          total-length readout sit outside the hover-hidden chrome group so
          they're always visible. */}
      <Ruler
        sections={sections}
        silhouetteScale={silhouetteScale}
        silhouetteY={silhouetteY}
        silhouetteH={silhouetteH}
        rulerAxisX={rulerAxisX}
      />
      <TotalReadout
        x={silhouetteCenter}
        y={silhouetteY + silhouetteH + 18}
        totalHeightMm={totalHeightMm}
        maxDiameterMm={maxDiameterMm}
        sizeMode={sizeMode}
      />

      <g className="cone-editor-chrome">
        {/* Per-section height inputs + bracket leaders. */}
        {sections.map((meta) => (
          <HeightLabel
            key={meta.section.id}
            meta={meta}
            silhouetteScale={silhouetteScale}
            silhouetteY={silhouetteY}
            silhouetteCenter={silhouetteCenter}
            x={heightLabelX}
            onChange={(v) => setHeight(meta.section.id, v)}
          />
        ))}

        {sections.map((meta) => (
          <DiameterLabel
            key={meta.section.id}
            meta={meta}
            silhouetteScale={silhouetteScale}
            silhouetteCenter={silhouetteCenter}
            silhouetteY={silhouetteY}
            labelLeft={diameterLabelX}
            onChange={(v) => setDiameter(meta.section.id, v)}
            knownSizeMm={knownSizeMm}
          />
        ))}

        {sections.map((meta) => (
          <CircumferenceLabel
            key={meta.section.id}
            meta={meta}
            silhouetteScale={silhouetteScale}
            silhouetteY={silhouetteY}
            x={diameterLabelX + LABEL_INPUT_W_PX + CIRC_LABEL_GAP_PX}
            onChange={(v) => {
              setCircumference(meta.section.id, v);
              // After applying the change, find the largest non-null
              // section circumference. Set: only sync when this update
              // is (or ties for) the new max. Cleared: always re-sync,
              // dropping known to the next largest, or to null when no
              // section has a circumference left.
              const latest = useToyStore.getState().sections;
              let max: number | null = null;
              for (const s of latest) {
                if (s.circumference != null && (max == null || s.circumference > max)) {
                  max = s.circumference;
                }
              }
              if (v != null) {
                if (v >= (max ?? 0)) setKnownSize(v / Math.PI);
              } else {
                setKnownSize(max == null ? null : max / Math.PI);
              }
            }}
          />
        ))}

      {/* Internal boundary drag bands (between adjacent sections). Rendered
          before the diameter handles so the small handle circles end up on
          top and win hit-testing where they overlap. */}
      {sections.slice(0, -1).map((meta) => {
        const boundaryMm = meta.bottomMm;
        const y = silhouetteY + boundaryMm * silhouetteScale;
        const bandWidth = silhouetteW + 16;
        const bandX = silhouetteX - 8;
        return (
          <rect
            key={`b-${meta.section.id}`}
            className="cone-editor-handle-boundary"
            x={bandX}
            y={y - 4}
            width={bandWidth}
            height={8}
            rx={4}
            onPointerDown={(e) => onBoundaryPointerDown(e, meta.section.id, boundaryMm)}
            onPointerMove={onBoundaryPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        );
      })}

      {/* Bottom-of-toy drag band — grows / shrinks the last section. */}
      {sections.length > 0 && (() => {
        const last = sections[sections.length - 1];
        const bottomMm = last.bottomMm;
        const y = silhouetteY + bottomMm * silhouetteScale;
        const bandWidth = silhouetteW + 16;
        const bandX = silhouetteX - 8;
        return (
          <rect
            key="bottom"
            className="cone-editor-handle-boundary cone-editor-handle-bottom"
            x={bandX}
            y={y - 4}
            width={bandWidth}
            height={8}
            rx={4}
            onPointerDown={(e) =>
              onBottomPointerDown(e, last.section.id, bottomMm, last.topMm)
            }
            onPointerMove={onBottomPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        );
      })()}

      {/* Diameter drag handles — at the section's bottom-right corner. Drawn
          AFTER the boundary bands so the handle is on top: clicks on the
          handle trigger diameter drag, while clicks on the band elsewhere
          still trigger boundary drag. */}
      {sections.map((meta) => {
        const isShapedBottomCap =
          meta.isLast && sectionsLen > 1 && bottomShape !== Shape.FLAT;
        if (isShapedBottomCap) return null;
        const cx = silhouetteCenter + (meta.section.diameter * silhouetteScale) / 2;
        const cy = silhouetteY + meta.bottomMm * silhouetteScale;
        return (
          <circle
            key={`d-${meta.section.id}`}
            className="cone-editor-handle cone-editor-handle-diameter"
            cx={cx}
            cy={cy}
            r={HANDLE_R_PX}
            onPointerDown={(e) => onDiameterPointerDown(e, meta.section.id, cx)}
            onPointerMove={onDiameterPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        );
      })}

      {/* Per-section × remove button — sits to the right of the
          circumference input (the rightmost input in the row). The
          bottom section's inputs are below the silhouette, so the
          button follows them there. */}
      {sectionsLen > 1 &&
        sections.map((meta) => {
          const circRight =
            diameterLabelX + LABEL_INPUT_W_PX + CIRC_LABEL_GAP_PX + LABEL_INPUT_W_PX;
          const cx = circRight + REMOVE_R_PX + 2;
          const cy = meta.isLast
            ? silhouetteY + meta.bottomMm * silhouetteScale + 22
            : silhouetteY + meta.midMm * silhouetteScale;
          return (
            <g
              key={`x-${meta.section.id}`}
              className="cone-editor-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeSection(meta.section.id);
              }}
              role="button"
              aria-label={`Remove section ${meta.index + 1}`}
            >
              <circle cx={cx} cy={cy} r={REMOVE_R_PX} />
              <text x={cx} y={cy + 3} textAnchor="middle">×</text>
            </g>
          );
        })}

      </g>
    </>
  );
};

// ─── Ruler ──────────────────────────────────────────────────────────────────

type RulerProps = {
  sections: SectionMeta[];
  silhouetteScale: number;
  silhouetteY: number;
  silhouetteH: number;
  rulerAxisX: number;
};

const Ruler = ({
  sections,
  silhouetteScale,
  silhouetteY,
  silhouetteH,
  rulerAxisX,
}: RulerProps) => {
  const unit = useEditorUnit();
  const tickInner = rulerAxisX + 6;
  const tickOuter = rulerAxisX - 6;
  const labelX = rulerAxisX - 10;
  const ticks = [{ mm: 0 }, ...sections.map((s) => ({ mm: s.bottomMm }))];

  return (
    <g className="cone-editor-ruler" aria-hidden>
      <line
        className="cone-editor-ruler-axis"
        x1={rulerAxisX}
        x2={rulerAxisX}
        y1={silhouetteY}
        y2={silhouetteY + silhouetteH}
      />
      {ticks.map((t, i) => {
        const y = silhouetteY + t.mm * silhouetteScale;
        return (
          <g key={i}>
            <line
              className="cone-editor-ruler-tick"
              x1={tickOuter}
              x2={tickInner}
              y1={y}
              y2={y}
            />
            <text
              className="cone-editor-ruler-label"
              x={labelX}
              y={y + 4}
              textAnchor="end"
            >
              {fmtUnitNum(t.mm, unit)}
            </text>
          </g>
        );
      })}
      <text
        className="cone-editor-ruler-unit"
        x={labelX}
        y={silhouetteY - 8}
        textAnchor="end"
      >
        {unit.id}
      </text>
    </g>
  );
};

// ─── Total readout (under silhouette) ──────────────────────────────────────

type TotalReadoutProps = {
  x: number;
  y: number;
  totalHeightMm: number;
  maxDiameterMm: number;
  sizeMode: "diameter" | "circumference";
};

const TotalReadout = ({
  x,
  y,
  totalHeightMm,
  maxDiameterMm,
  sizeMode,
}: TotalReadoutProps) => {
  const unit = useEditorUnit();
  const sizeMm =
    sizeMode === "circumference" ? maxDiameterMm * Math.PI : maxDiameterMm;
  const sizePrefix = sizeMode === "circumference" ? "C" : "Ø";
  return (
    <text
      className="cone-editor-total-readout"
      x={x}
      y={y}
      textAnchor="middle"
    >
      total {fmtUnit(totalHeightMm, unit)}  ·  {sizePrefix} {fmtUnit(sizeMm, unit)}
    </text>
  );
};

// ─── Floating editable labels (height + diameter) ────────────────────────────

type HeightLabelProps = {
  meta: SectionMeta;
  silhouetteScale: number;
  silhouetteY: number;
  silhouetteCenter: number;
  x: number;
  onChange: (mm: number) => void;
};

const HeightLabel = ({
  meta,
  silhouetteScale,
  silhouetteY,
  silhouetteCenter,
  x,
  onChange,
}: HeightLabelProps) => {
  const unit = useEditorUnit();
  const touched = meta.section.touched?.height ?? true;
  const display = (meta.section.height / unit.factor).toFixed(unit.decimals);
  const yTop = silhouetteY + meta.topMm * silhouetteScale;
  const yMid = silhouetteY + meta.midMm * silhouetteScale;
  const yBottom = silhouetteY + meta.bottomMm * silhouetteScale;
  // Mirror of the diameter Z-leader: lead-out from the input's right edge,
  // then a vertical bracket spanning the section's full height with
  // horizontal extension lines reaching the silhouette's left edge at top
  // and bottom.
  const inputRight = x + LABEL_INPUT_W_PX;
  const leadOutPx = 12;
  const bendX = inputRight + leadOutPx;
  const sectionLeftAtTop =
    silhouetteCenter - (meta.previousDiameter * silhouetteScale) / 2;
  const sectionLeftAtBottom =
    silhouetteCenter - (meta.section.diameter * silhouetteScale) / 2;
  const leaderD = [
    `M ${inputRight + 2} ${yMid} L ${bendX} ${yMid}`,
    `M ${sectionLeftAtTop} ${yTop} L ${bendX} ${yTop} L ${bendX} ${yBottom} L ${sectionLeftAtBottom} ${yBottom}`,
  ].join(" ");
  return (
    <g>
      <path
        className={`cone-editor-leader ${touched ? "is-touched" : "is-default"}`}
        d={leaderD}
      />
      <foreignObject
        x={x}
        y={yMid - LABEL_INPUT_H_PX / 2}
        width={LABEL_INPUT_W_PX}
        height={LABEL_INPUT_H_PX}
      >
        <div
          className={`cone-editor-floating ${touched ? "is-touched" : "is-default"}`}
          style={{ width: "100%", height: "100%" }}
        >
          <span className="cone-editor-floating-prefix">H</span>
          <input
            type="number"
            aria-label={`Height of section ${meta.index + 1}`}
            step={10 ** -unit.decimals}
            min={0}
            value={display}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (Number.isNaN(parsed)) return;
              onChange(Math.max(0, parsed) * unit.factor);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </foreignObject>
    </g>
  );
};

type DiameterLabelProps = {
  meta: SectionMeta;
  silhouetteScale: number;
  silhouetteCenter: number;
  silhouetteY: number;
  labelLeft: number;
  onChange: (mm: number) => void;
  knownSizeMm: number | null;
};

const DiameterLabel = ({
  meta,
  silhouetteScale,
  silhouetteCenter,
  silhouetteY,
  labelLeft,
  onChange,
  knownSizeMm,
}: DiameterLabelProps) => {
  const unit = useEditorUnit();
  const touched = meta.section.touched?.diameter ?? true;
  // The diameter applies at the section's *bottom* edge (where the drag
  // handle sits). For interior sections the input sits at the section's
  // vertical midpoint; for the bottom section, push the input below the
  // silhouette so it doesn't crowd the bottom cap area, and let the leader
  // run upward to the bottom-right corner.
  const yBottom = silhouetteY + meta.bottomMm * silhouetteScale;
  const inputY = meta.isLast ? yBottom + 22 : silhouetteY + meta.midMm * silhouetteScale;
  const sectionEdgeX = silhouetteCenter + (meta.section.diameter * silhouetteScale) / 2;
  const display = (meta.section.diameter / unit.factor).toFixed(unit.decimals);
  const overshoots = knownSizeMm != null && meta.section.diameter > knownSizeMm + 0.5;

  // Z-shaped leader: a short horizontal lead-out from the input, a vertical
  // drop, then a horizontal run into the section's bottom-right corner.
  const leadOutPx = 12;
  const bendX = labelLeft - 2 - leadOutPx;
  return (
    <g>
      <path
        className={`cone-editor-leader ${touched ? "is-touched" : "is-default"}`}
        d={`M ${labelLeft - 2} ${inputY} L ${bendX} ${inputY} L ${bendX} ${yBottom} L ${sectionEdgeX} ${yBottom}`}
      />
      <foreignObject
        x={labelLeft}
        y={inputY - LABEL_INPUT_H_PX / 2}
        width={LABEL_INPUT_W_PX + (overshoots ? 18 : 0)}
        height={LABEL_INPUT_H_PX}
      >
        <div
          className={`cone-editor-floating ${touched ? "is-touched" : "is-default"}`}
          style={{ width: "100%", height: "100%" }}
        >
          <span className="cone-editor-floating-prefix">Ø</span>
          <input
            type="number"
            aria-label={`Diameter of section ${meta.index + 1}`}
            step={10 ** -unit.decimals}
            min={0}
            value={display}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (Number.isNaN(parsed)) return;
              onChange(Math.max(0, parsed) * unit.factor);
            }}
            onClick={(e) => e.stopPropagation()}
          />
          {overshoots && (
            <span
              className="cone-editor-floating-warn"
              title="Section is wider than the known size guide"
              aria-label="Section exceeds the known size guide"
            >
              ⚠
            </span>
          )}
        </div>
      </foreignObject>
    </g>
  );
};

// ─── Circumference label (independent per-section measurement) ───────────────

type CircumferenceLabelProps = {
  meta: SectionMeta;
  silhouetteScale: number;
  silhouetteY: number;
  x: number;
  onChange: (mm: number | null) => void;
};

const CircumferenceLabel = ({
  meta,
  silhouetteScale,
  silhouetteY,
  x,
  onChange,
}: CircumferenceLabelProps) => {
  const unit = useEditorUnit();
  const value = meta.section.circumference;
  const touched = value != null;
  const display = value == null ? "" : (value / unit.factor).toFixed(unit.decimals);
  const yBottom = silhouetteY + meta.bottomMm * silhouetteScale;
  const inputY = meta.isLast ? yBottom + 22 : silhouetteY + meta.midMm * silhouetteScale;
  return (
    <foreignObject
      x={x}
      y={inputY - LABEL_INPUT_H_PX / 2}
      width={LABEL_INPUT_W_PX}
      height={LABEL_INPUT_H_PX}
    >
      <div
        className={`cone-editor-floating ${touched ? "is-touched" : "is-default"}`}
        style={{ width: "100%", height: "100%" }}
      >
        <span className="cone-editor-floating-prefix">C</span>
        <input
          type="number"
          aria-label={`Circumference of section ${meta.index + 1}`}
          step={10 ** -unit.decimals}
          min={0}
          value={display}
          placeholder="—"
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(null);
              return;
            }
            const parsed = Number(raw);
            if (Number.isNaN(parsed)) return;
            onChange(Math.max(0, parsed) * unit.factor);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </foreignObject>
  );
};
