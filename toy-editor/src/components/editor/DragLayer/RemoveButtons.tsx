import { useToyStore } from "../../../toyMachine";
import { useEditorLayoutCtx } from "../EditorLayoutContext";
import { removeButtonPosition } from "../geometry";
import { REMOVE_R_PX } from "../layout";

const RemoveButtons = () => {
  const layout = useEditorLayoutCtx();
  const removeSection = useToyStore((s) => s.removeSection);
  const showSectionCirc = useToyStore((s) => s.showSectionCircumference);

  if (layout.sectionMeta.length <= 1) return null;

  return (
    <>
      {layout.sectionMeta.map((meta) => {
        const { cx, cy } = removeButtonPosition(meta, layout, showSectionCirc);
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
    </>
  );
};

export default RemoveButtons;
