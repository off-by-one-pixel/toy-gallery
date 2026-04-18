import type { ChangeEvent, DragEvent } from "react";
import { useState } from "react";
import type { Shape } from "../toyMachine";
import { useToyStore } from "../toyMachine";
import { useEditorUnit } from "./unit";

const EditorControls = () => {
  const toy = useToyStore();
  const unit = useEditorUnit();
  const step = unit === "in" ? 0.1 : 1;
  const decimals = unit === "in" ? 2 : 0;
  const format = (v: number) => Number(v.toFixed(decimals));
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
                    min={0}
                    step={step}
                    value={format(section.diameter)}
                    onChange={(e) => toy.setDiameter(section.id, Number(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="cone-editor-section-sep">×</span>
                  <input
                    type="number"
                    aria-label="Height"
                    min={0}
                    step={step}
                    value={format(section.height)}
                    onChange={(e) => toy.setHeight(section.id, Number(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="cone-editor-section-sep">·</span>
                  <input
                    type="number"
                    aria-label="Circumference"
                    placeholder="C"
                    min={0}
                    step={step}
                    value={section.circumference == null ? "" : format(section.circumference)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      toy.setCircumference(section.id, raw === "" ? null : Number(raw));
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="cone-editor-section-unit">{unit}</span>
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
