import type { ReactNode, RefObject } from "react";
import { useEffect } from "react";
import type { StyleOption, Toy } from "../toyMachine";
import { Shape, useToyStore } from "../toyMachine";
import KnownMeasurements from "./KnownMeasurements";
import { Render } from "./Render";
import { EditorUnitContext, type Unit } from "./unit";

type Props = {
  width?: number;
  scaleFactor?: number;
  style?: Partial<StyleOption>;
  onChange?: (toy: Toy) => void;
  ref?: RefObject<SVGSVGElement | null>;
  /**
   * Optional seed state. When the identity of this object changes (e.g. the
   * caller opens the editor for a different toy), the store is reset to
   * match. Pass a stable reference to avoid clobbering user edits.
   */
  initialToy?: Toy;
  /**
   * Rendered at the top of the editor, above the Known Measurements row.
   * Wrappers can use this for app-specific identification fields
   * (brand / model / color).
   */
  leadingSlot?: ReactNode;
  /** Display unit for numeric inputs. Storage is always canonical (mm-equivalent). */
  unit: Unit;
};

const CAP_SHAPES: { id: Shape; label: string; glyph: string }[] = [
  { id: Shape.FLAT, label: "Flat", glyph: "▬" },
  { id: Shape.EGG, label: "Egg", glyph: "◒" },
  { id: Shape.CONE, label: "Cone", glyph: "△" },
  { id: Shape.SPIKE, label: "Spike", glyph: "▲" },
];

const ToyEditor = ({
  width,
  scaleFactor = 1,
  style = {},
  onChange,
  ref,
  initialToy,
  leadingSlot,
  unit,
}: Props) => {
  const toy = useToyStore();
  const hydrate = useToyStore((s) => s.hydrate);
  const effectiveScale = width ? width / Math.max(toy.getMaxWidth(), 1) : scaleFactor;
  const mergedStyle = { ...toy.style, ...style } as StyleOption;
  const fixed = width !== undefined;

  useEffect(() => {
    if (initialToy) hydrate(initialToy);
  }, [initialToy, hydrate]);

  useEffect(() => {
    onChange?.(toy.getToy());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    toy.sections,
    toy.topShape,
    toy.bottomShape,
    toy.insertableLengthMm,
    toy.knownTotalMm,
    toy.knownSizeMm,
    toy.sizeDisplayMode,
  ]);

  return (
    <EditorUnitContext.Provider value={unit}>
      <div className="cone-editor-root">
        <div className="cone-editor-main">
          <KnownMeasurements />

          <section className="cone-editor-canvas">
            <div className="cone-editor-cap-row top">
              <ShapeSelect
                id="cone-editor-top-shape"
                label="Top shape"
                value={toy.topShape}
                onChange={toy.setTopShape}
              />
            </div>

            <div className="cone-editor-stage">
              <Render
                toy={toy}
                ref={ref}
                scaleFactor={effectiveScale}
                style={mergedStyle}
                selectedId={toy.selectedId}
                onSelect={toy.setSelected}
                fixed={fixed}
              />
            </div>

            <div className="cone-editor-cap-row bottom">
              <ShapeSelect
                id="cone-editor-bottom-shape"
                label="Bottom shape"
                value={toy.bottomShape}
                onChange={toy.setBottomShape}
              />
            </div>

            <div className="cone-editor-canvas-actions">
              <button
                type="button"
                className="cone-editor-btn cone-editor-add"
                onClick={() => toy.newSection()}
              >
                + Add section
              </button>
            </div>
          </section>
        </div>

        {leadingSlot && (
          <aside className="cone-editor-side">{leadingSlot}</aside>
        )}
      </div>
    </EditorUnitContext.Provider>
  );
};

type ShapeSelectProps = {
  id: string;
  label: string;
  value: Shape;
  onChange: (s: Shape) => void;
};

const ShapeSelect = ({ id, label, value, onChange }: ShapeSelectProps) => (
  <select
    id={id}
    aria-label={label}
    className="cone-editor-shape-select"
    value={value}
    onChange={(e) => onChange(e.target.value as Shape)}
  >
    {CAP_SHAPES.map(({ id: optId, label: optLabel, glyph }) => (
      <option key={optId} value={optId}>
        {glyph}  {optLabel}
      </option>
    ))}
  </select>
);

export default ToyEditor;
