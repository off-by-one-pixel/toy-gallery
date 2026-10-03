import type { ReactNode, RefObject } from "react";
import { useEffect } from "react";
import type { StyleOption, Toy } from "../toyMachine";
import { Shape, useToyStore } from "../toyMachine";
import EditorRender from "./editor/EditorRender";
import { EditorPaletteContext, type PaletteColor } from "./editor/palette";
import KnownMeasurements from "./KnownMeasurements";
import { EditorUnitContext, type Unit } from "./unit";

const NO_PALETTE: readonly PaletteColor[] = [];

type Props = {
  style?: Partial<StyleOption>;
  onChange?: (toy: Toy) => void;
  ref?: RefObject<SVGSVGElement | null>;
  initialToy?: Toy;
  leadingSlot?: ReactNode;
  unit: Unit;
  palette?: readonly PaletteColor[];
};

const CAP_SHAPES: { id: Shape; label: string; glyph: string }[] = [
  { id: Shape.FLAT, label: "Flat", glyph: "▬" },
  { id: Shape.EGG, label: "Egg", glyph: "◒" },
  { id: Shape.CONE, label: "Cone", glyph: "△" },
  { id: Shape.SPIKE, label: "Spike", glyph: "▲" },
];

const ToyEditor = ({
  style = {},
  onChange,
  ref,
  initialToy,
  leadingSlot,
  unit,
  palette = NO_PALETTE,
}: Props) => {
  const toy = useToyStore();
  const hydrate = useToyStore((s) => s.hydrate);
  const mergedStyle = { ...toy.style, ...style } as StyleOption;

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
  ]);

  return (
    <EditorUnitContext.Provider value={unit}>
      <EditorPaletteContext.Provider value={palette}>
        <div className="toy-editor-root">
        <div className="toy-editor-main">
          <KnownMeasurements />

          <section className="toy-editor-canvas">
            <div className="toy-editor-cap-row top">
              <ShapeSelect
                id="toy-editor-top-shape"
                label="Top shape"
                value={toy.topShape}
                onChange={toy.setTopShape}
              />
            </div>

            <div className="toy-editor-stage">
              <EditorRender
                toy={toy}
                ref={ref}
                style={mergedStyle}
                onSelect={toy.setSelected}
              />
            </div>

            <div className="toy-editor-cap-row bottom">
              <ShapeSelect
                id="toy-editor-bottom-shape"
                label="Bottom shape"
                value={toy.bottomShape}
                onChange={toy.setBottomShape}
              />
            </div>

            <div className="toy-editor-canvas-actions">
              <button
                type="button"
                className="toy-editor-btn toy-editor-add"
                onClick={() => toy.newSection()}
              >
                + Add section
              </button>
            </div>
          </section>
        </div>

          {leadingSlot && <aside className="toy-editor-side">{leadingSlot}</aside>}
        </div>
      </EditorPaletteContext.Provider>
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
    className="toy-editor-shape-select"
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
