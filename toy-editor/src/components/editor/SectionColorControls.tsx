import { useToyStore } from "../../toyMachine";
import { useEditorLayoutCtx } from "./EditorLayoutContext";
import { useEditorUiStore } from "./editorUiStore";
import { lastInputRightX } from "./geometry";
import { useEditorPalette } from "./palette";
import { LABEL_INPUT_H_PX, type SectionMeta, sectionInputY } from "./layout";

const CHIP_CELL_PX = 24;
const POPOVER_COLS = 8;
const POPOVER_PAD_PX = 8;

const customPickerValue = (color: string | null | undefined): string =>
  color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#888888";

const SectionColorControls = () => {
  const palette = useEditorPalette();
  const layout = useEditorLayoutCtx();
  const showSectionCirc = useToyStore((s) => s.showSectionCircumference);
  const setSectionColor = useToyStore((s) => s.setSectionColor);
  const openId = useEditorUiStore((s) => s.colorPickerSectionId);
  const setOpenId = useEditorUiStore((s) => s.setColorPickerSectionId);

  if (palette.length === 0) return null;

  const { sectionMeta, silhouetteScale, silhouetteY, size } = layout;
  const swatchX = lastInputRightX(layout, showSectionCirc) + 6;
  const swatchY = (meta: SectionMeta) =>
    sectionInputY(meta, silhouetteScale, silhouetteY) - LABEL_INPUT_H_PX / 2;
  const openMeta = sectionMeta.find((meta) => meta.section.id === openId) ?? null;

  const chipCount = palette.length + 2;
  const rows = Math.ceil(chipCount / POPOVER_COLS);
  const popoverW = Math.min(chipCount, POPOVER_COLS) * CHIP_CELL_PX + POPOVER_PAD_PX * 2;
  const popoverH = rows * CHIP_CELL_PX + POPOVER_PAD_PX * 2;

  const pick = (id: number, color: string | null) => {
    setSectionColor(id, color);
    setOpenId(null);
  };

  return (
    <>
      {sectionMeta.map((meta) => (
        <foreignObject
          key={`swatch-${meta.section.id}`}
          x={swatchX}
          y={swatchY(meta)}
          width={LABEL_INPUT_H_PX}
          height={LABEL_INPUT_H_PX}
        >
          <button
            type="button"
            className={`toy-editor-swatch ${meta.section.color ? "" : "is-auto"}`}
            style={meta.section.color ? { backgroundColor: meta.section.color } : undefined}
            aria-label={`Color of section ${meta.index + 1}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpenId(openId === meta.section.id ? null : meta.section.id);
            }}
          />
        </foreignObject>
      ))}

      {openMeta && (
        <>
          <rect
            x={0}
            y={0}
            width={size.w}
            height={size.h}
            fill="transparent"
            onClick={() => setOpenId(null)}
          />
          <foreignObject
            x={Math.max(4, swatchX - popoverW - 6)}
            y={Math.min(
              Math.max(4, swatchY(openMeta) + LABEL_INPUT_H_PX / 2 - popoverH / 2),
              Math.max(4, size.h - popoverH - 4),
            )}
            width={popoverW}
            height={popoverH}
          >
            <div className="toy-editor-palette" role="listbox" aria-label="Section color">
              <button
                type="button"
                className="toy-editor-palette-chip is-auto"
                aria-label="Toy color"
                title="Toy color"
                onClick={() => pick(openMeta.section.id, null)}
              />
              {palette.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className="toy-editor-palette-chip"
                  style={{ backgroundColor: color.value }}
                  aria-label={color.name}
                  title={color.name}
                  onClick={() => pick(openMeta.section.id, color.value)}
                />
              ))}
              <label className="toy-editor-palette-chip is-custom" title="Custom color">
                <input
                  type="color"
                  aria-label="Custom color"
                  value={customPickerValue(openMeta.section.color)}
                  onChange={(e) => setSectionColor(openMeta.section.id, e.target.value)}
                />
              </label>
            </div>
          </foreignObject>
        </>
      )}
    </>
  );
};

export default SectionColorControls;
