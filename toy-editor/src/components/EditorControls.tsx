import type { ChangeEvent, DragEvent } from "react";
import { useState } from "react";
import type { Shape } from "../toyMachine";
import { useToyStore } from "../toyMachine";
import { useEditorUnit } from "./unit";

const CAP_SHAPES: { id: Shape; label: string; glyph: string }[] = [
  { id: "FLAT", label: "Flat", glyph: "▬" },
  { id: "EGG", label: "Egg", glyph: "◒" },
  { id: "CONE", label: "Cone", glyph: "△" },
  { id: "SPIKE", label: "Spike", glyph: "▲" },
];

type ShapeRadioProps = {
  groupName: string;
  label: string;
  value: Shape;
  onChange: (shape: Shape) => void;
};

const ShapeRadio = ({ groupName, label, value, onChange }: ShapeRadioProps) => (
  <section className="cone-editor-group">
    <h2 className="cone-editor-group-title">{label}</h2>
    <select
      id={groupName}
      aria-label={label}
      className="cone-editor-shape-select"
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as Shape)}
    >
      {CAP_SHAPES.map(({ id, label: optLabel, glyph }) => (
        <option key={id} value={id}>
          {glyph}  {optLabel}
        </option>
      ))}
    </select>
  </section>
);

const EditorControls = () => {
  const toy = useToyStore();
  const unit = useEditorUnit();
  const step = 10 ** -unit.decimals;
  const toDisplay = (canonical: number) => Number((canonical / unit.factor).toFixed(unit.decimals));
  const fromDisplay = (display: number) => display * unit.factor;
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: number; position: "before" | "after" } | null>(
    null,
  );

  const onDragStart = (id: number) => (e: DragEvent<HTMLLIElement>) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
    setDraggedId(id);
  };
  const onDragOver = (id: number) => (e: DragEvent<HTMLLIElement>) => {
    if (draggedId === null || draggedId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const position: "before" | "after" =
      e.clientY - rect.top < rect.height / 2 ? "before" : "after";
    if (dropTarget?.id !== id || dropTarget.position !== position) {
      setDropTarget({ id, position });
    }
  };
  const onDragLeave = (id: number) => () => {
    if (dropTarget?.id === id) setDropTarget(null);
  };
  const onDrop = (id: number) => (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    if (draggedId !== null && draggedId !== id && dropTarget) {
      toy.reorderSection(draggedId, id, dropTarget.position);
    }
    setDraggedId(null);
    setDropTarget(null);
  };
  const onDragEnd = () => {
    setDraggedId(null);
    setDropTarget(null);
  };

  return (
    <>
      <div className="cone-editor-shape-row">
        <ShapeRadio
          groupName="cone-editor-top-shape"
          label="Top shape"
          value={toy.topShape}
          onChange={toy.setTopShape}
        />
        <ShapeRadio
          groupName="cone-editor-bottom-shape"
          label="Bottom shape"
          value={toy.bottomShape}
          onChange={toy.setBottomShape}
        />
      </div>

      <section className="cone-editor-group cone-editor-sections-group">
        <h2 className="cone-editor-group-title">Sections (top → bottom)</h2>
        <ol className="cone-editor-sections">
          {toy.sections.map((section, index) => {
            const isShapedBottomCap =
              index === toy.sections.length - 1 &&
              toy.sections.length > 1 &&
              toy.bottomShape !== "FLAT";
            const selected = toy.selectedId === section.id;
            const rowClasses = ["cone-editor-section"];
            if (selected) rowClasses.push("cone-editor-section-selected");
            if (draggedId === section.id) rowClasses.push("cone-editor-section-dragging");
            if (dropTarget?.id === section.id) {
              rowClasses.push(
                dropTarget.position === "before"
                  ? "cone-editor-section-drop-before"
                  : "cone-editor-section-drop-after",
              );
            }
            return (
              <li
                key={section.id}
                className={rowClasses.join(" ")}
                draggable
                onDragStart={onDragStart(section.id)}
                onDragOver={onDragOver(section.id)}
                onDragLeave={onDragLeave(section.id)}
                onDrop={onDrop(section.id)}
                onDragEnd={onDragEnd}
                onClick={() => toy.setSelected(section.id)}
                role="button"
                tabIndex={0}
              >
                <span className="cone-editor-drag-handle" aria-hidden>
                  ⋮⋮
                </span>
                <div className="cone-editor-section-vals">
                  <input
                    type="number"
                    aria-label="Diameter"
                    min={0}
                    step={step}
                    value={toDisplay(section.diameter)}
                    onChange={(e) =>
                      toy.setDiameter(section.id, fromDisplay(Number(e.target.value)))
                    }
                    onClick={(e) => e.stopPropagation()}
                    tabIndex={isShapedBottomCap ? -1 : 0}
                    style={isShapedBottomCap ? { visibility: "hidden" } : undefined}
                  />
                  <span
                    className="cone-editor-section-sep"
                    style={isShapedBottomCap ? { visibility: "hidden" } : undefined}
                  >
                    ×
                  </span>
                  <input
                    type="number"
                    aria-label="Height"
                    min={0}
                    step={step}
                    value={toDisplay(section.height)}
                    onChange={(e) => toy.setHeight(section.id, fromDisplay(Number(e.target.value)))}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span
                    className="cone-editor-section-sep"
                    style={isShapedBottomCap ? { visibility: "hidden" } : undefined}
                  >
                    ·
                  </span>
                  <input
                    type="number"
                    aria-label="Circumference"
                    placeholder="C"
                    min={0}
                    step={step}
                    value={section.circumference == null ? "" : toDisplay(section.circumference)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      toy.setCircumference(
                        section.id,
                        raw === "" ? null : fromDisplay(Number(raw)),
                      );
                    }}
                    onClick={(e) => e.stopPropagation()}
                    tabIndex={isShapedBottomCap ? -1 : 0}
                    style={isShapedBottomCap ? { visibility: "hidden" } : undefined}
                  />
                  <span className="cone-editor-section-unit">{unit.id}</span>
                </div>
                {toy.sections.length > 1 && (
                  <button
                    type="button"
                    className="cone-editor-btn cone-editor-btn-icon cone-editor-btn-danger"
                    aria-label="Remove section"
                    onClick={(e) => {
                      e.stopPropagation();
                      toy.removeSection(section.id);
                    }}
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          className="cone-editor-btn cone-editor-add"
          onClick={() => toy.newSection()}
        >
          + Add section
        </button>
      </section>
    </>
  );
};

export default EditorControls;
