import { useToyStore } from "../../../toyMachine";
import { useEditorLayoutCtx } from "../EditorLayoutContext";
import { removeButtonPosition } from "../geometry";
import { LABEL_INPUT_H_PX, REMOVE_R_PX } from "../layout";
import { useEditorPalette } from "../palette";

const RemoveButtons = () => {
  const layout = useEditorLayoutCtx();
  const removeSection = useToyStore((s) => s.removeSection);
  const showSectionCirc = useToyStore((s) => s.showSectionCircumference);
  const palette = useEditorPalette();
  const xOffset = palette.length > 0 ? LABEL_INPUT_H_PX + 8 : 0;

  if (layout.sectionMeta.length <= 1) return null;

  return (
    <>
      {layout.sectionMeta.map((meta) => {
        const { cx, cy } = removeButtonPosition(meta, layout, showSectionCirc, xOffset);
        return (
          <g
            key={`x-${meta.section.id}`}
            className="toy-editor-remove"
            onClick={(e) => {
              e.stopPropagation();
              removeSection(meta.section.id);
            }}
            role="button"
            aria-label={`Remove section ${meta.index + 1}`}
          >
            <circle cx={cx} cy={cy} r={REMOVE_R_PX} />
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">×</text>
          </g>
        );
      })}
    </>
  );
};

export default RemoveButtons;
