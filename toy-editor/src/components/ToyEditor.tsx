import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import type { StyleOption, Toy } from '../toyMachine';
import { Shape, useToyStore } from '../toyMachine';
import EditorRender from './editor/EditorRender';
import { useReferenceImage } from './editor/hooks/useReferenceImage';
import ReferenceImageControls from './editor/ReferenceImageControls';
import type { ToyEditorLabels } from './editor/labels';
import KnownMeasurements from './KnownMeasurements';
import { EditorConfigContext, type PaletteColor, type Unit } from './editorConfig';

const NO_PALETTE: readonly PaletteColor[] = [];

const DEFAULT_STYLE: StyleOption = {
  borderWidth: 2,
  borderColor: '#000',
  color: 'lightblue',
};

type Props = {
  style?: Partial<StyleOption>;
  initialToy?: Toy;
  leadingSlot?: ReactNode;
  unit: Unit;
  palette?: readonly PaletteColor[];
  labels: ToyEditorLabels;
};

const CAP_SHAPES: { id: Shape; glyph: string }[] = [
  { id: Shape.FLAT, glyph: '▬' },
  { id: Shape.EGG, glyph: '◒' },
  { id: Shape.CONE, glyph: '△' },
  { id: Shape.SPIKE, glyph: '▲' },
];

const ToyEditor = ({ style = {}, initialToy, leadingSlot, unit, palette = NO_PALETTE, labels }: Props) => {
  const toy = useToyStore();
  const hydrate = useToyStore((s) => s.hydrate);
  const mergedStyle = { ...DEFAULT_STYLE, ...style };
  const reference = useReferenceImage();
  const config = useMemo(() => ({ unit, labels, palette }), [unit, labels, palette]);

  useEffect(() => {
    if (initialToy) hydrate(initialToy);
  }, [initialToy, hydrate]);

  return (
    <EditorConfigContext.Provider value={config}>
      <div className="toy-editor-root">
        <div className="toy-editor-main">
          <KnownMeasurements />

          <section className="toy-editor-canvas" onDragOver={reference.onDragOver} onDrop={reference.onDrop}>
            <ReferenceImageControls reference={reference} />

            <div className="toy-editor-cap-row top">
              <ShapeSelect
                id="toy-editor-top-shape"
                label={labels.topShape}
                shapeNames={labels.shapes}
                value={toy.topShape}
                onChange={toy.setTopShape}
              />
            </div>

            <div className="toy-editor-stage">
              <EditorRender
                toy={toy}
                style={mergedStyle}
                referenceImage={reference.image}
                onReferenceImageChange={reference.setImage}
              />
            </div>

            <div className="toy-editor-cap-row bottom">
              <ShapeSelect
                id="toy-editor-bottom-shape"
                label={labels.bottomShape}
                shapeNames={labels.shapes}
                value={toy.bottomShape}
                onChange={toy.setBottomShape}
              />
            </div>

            <div className="toy-editor-canvas-actions">
              <button type="button" className="toy-editor-btn toy-editor-add" onClick={() => toy.newSection()}>
                {labels.addSection}
              </button>
            </div>
          </section>
        </div>

        {leadingSlot && <aside className="toy-editor-side">{leadingSlot}</aside>}
      </div>
    </EditorConfigContext.Provider>
  );
};

type ShapeSelectProps = {
  id: string;
  label: string;
  shapeNames: Record<Shape, string>;
  value: Shape;
  onChange: (s: Shape) => void;
};

const ShapeSelect = ({ id, label, shapeNames, value, onChange }: ShapeSelectProps) => (
  <select
    id={id}
    aria-label={label}
    className="toy-editor-shape-select"
    value={value}
    onChange={(e) => onChange(e.target.value as Shape)}
  >
    {CAP_SHAPES.map(({ id: optId, glyph }) => (
      <option key={optId} value={optId}>
        {glyph} {shapeNames[optId]}
      </option>
    ))}
  </select>
);

export default ToyEditor;
