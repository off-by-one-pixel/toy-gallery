import type { ChangeEvent, DragEvent } from "react";
import { useState } from "react";
import type { Shape } from "../toyMachine";
import { useToyStore } from "../toyMachine";

const MIN_DIAMETER = 10;
const MAX_DIAMETER = 200;
const MIN_HEIGHT = 1;
const MAX_HEIGHT = 350;
const MIN_CIRCUMFERENCE = 1;
const MAX_CIRCUMFERENCE = 2000;

const EditorControls = () => {
  const toy = useToyStore();
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: number; position: "before" | "after" } | null>(
    null,
  );

  const clampDiameter = (v: number) => Math.min(Math.max(v, MIN_DIAMETER), MAX_DIAMETER);
  const clampHeight = (v: number) => Math.min(Math.max(v, MIN_HEIGHT), MAX_HEIGHT);
  const clampCircumference = (v: number) =>
    Math.min(Math.max(v, MIN_CIRCUMFERENCE), MAX_CIRCUMFERENCE);

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
      <section className="cone-editor-group">
        <h2 className="cone-editor-group-title">Top shape</h2>
        <div className="cone-editor-shape-radio">
          {(["egg", "cone"] as const).map((value) => (
            <label key={value} className="cone-editor-shape-option">
              <input
                type="radio"
                name="cone-editor-top-shape"
                value={value}
                checked={toy.topShape === value}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  toy.setTopShape(e.target.value as Shape)
                }
              />
              <span className="cone-editor-shape-glyph" aria-hidden>
                {value === "egg" ? "◒" : "▲"}
              </span>
              <span className="cone-editor-shape-label">{value === "egg" ? "Egg" : "Cone"}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="cone-editor-group cone-editor-sections-group">
        <h2 className="cone-editor-group-title">Sections (top → bottom)</h2>
        <ol className="cone-editor-sections">
          {toy.sections.map((section) => {
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
                    min={MIN_DIAMETER}
                    max={MAX_DIAMETER}
                    step={1}
                    value={Math.round(section.diameter)}
                    onChange={(e) => toy.setDiameter(section.id, clampDiameter(Number(e.target.value)))}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="cone-editor-section-sep">×</span>
                  <input
                    type="number"
                    aria-label="Height"
                    min={MIN_HEIGHT}
                    max={MAX_HEIGHT}
                    step={1}
                    value={Math.round(section.height)}
                    onChange={(e) => toy.setHeight(section.id, clampHeight(Number(e.target.value)))}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="cone-editor-section-sep">·</span>
                  <input
                    type="number"
                    aria-label="Circumference"
                    placeholder="C"
                    min={MIN_CIRCUMFERENCE}
                    max={MAX_CIRCUMFERENCE}
                    step={1}
                    value={
                      section.circumference == null ? "" : Math.round(section.circumference)
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      toy.setCircumference(
                        section.id,
                        raw === "" ? null : clampCircumference(Number(raw)),
                      );
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="cone-editor-section-unit">mm</span>
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
