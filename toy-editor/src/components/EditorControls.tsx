import type { ChangeEvent } from "react";
import { useToyStore } from "../toyMachine";
import type { Shape } from "../toyMachine";

const MIN_DIAMETER = 10;
const MAX_DIAMETER = 200;
const MIN_HEIGHT = 1;
const MAX_HEIGHT = 350;

const EditorControls = () => {
  const toy = useToyStore();

  return (
    <>
      {toy.sections.map((section, index) => {
        const isTop = index === 0;
        return (
          <div key={section.id} className="cone-editor-section">
            {!isTop && (
              <button
                type="button"
                className="cone-editor-btn cone-editor-btn-icon cone-editor-btn-danger"
                aria-label="Remove section"
                onClick={() => toy.removeSection(section.id)}
              >
                ×
              </button>
            )}
            <div className="cone-editor-section-move">
              <button
                type="button"
                className="cone-editor-btn cone-editor-btn-icon"
                aria-label="Move section up"
                onClick={() => toy.moveSection(section.id, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="cone-editor-btn cone-editor-btn-icon"
                aria-label="Move section down"
                onClick={() => toy.moveSection(section.id, 1)}
              >
                ↓
              </button>
            </div>
            <div className="cone-editor-fields">
              {isTop && (
                <label className="cone-editor-field">
                  <span className="cone-editor-field-label">Top shape</span>
                  <select
                    className="cone-editor-select"
                    value={toy.topShape}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                      toy.setTopShape(e.target.value as Shape)
                    }
                  >
                    <option value="cone">Cone</option>
                    <option value="egg">Egg</option>
                  </select>
                </label>
              )}
              <label className="cone-editor-field">
                <div className="cone-editor-field-header">
                  <span className="cone-editor-field-label">Diameter</span>
                  <span className="cone-editor-field-value">
                    {Math.round(section.diameter)} mm
                  </span>
                </div>
                <input
                  type="range"
                  className="cone-editor-slider"
                  min={MIN_DIAMETER}
                  max={MAX_DIAMETER}
                  step={1}
                  value={section.diameter}
                  onChange={(e) => toy.setDiameter(section.id, Number(e.target.value))}
                />
              </label>
              <label className="cone-editor-field">
                <div className="cone-editor-field-header">
                  <span className="cone-editor-field-label">Height</span>
                  <span className="cone-editor-field-value">
                    {Math.round(section.height)} mm
                  </span>
                </div>
                <input
                  type="range"
                  className="cone-editor-slider"
                  min={MIN_HEIGHT}
                  max={MAX_HEIGHT}
                  step={1}
                  value={section.height}
                  onChange={(e) => toy.setHeight(section.id, Number(e.target.value))}
                />
              </label>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className="cone-editor-btn cone-editor-btn-primary cone-editor-add"
        onClick={() => toy.newSection()}
      >
        + Add section
      </button>
    </>
  );
};

export default EditorControls;
