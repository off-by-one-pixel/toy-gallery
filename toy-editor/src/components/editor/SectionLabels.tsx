import { useToyStore } from "../../toyMachine";
import { useEditorLayoutCtx } from "./EditorLayoutContext";
import type { EditorLayout } from "./hooks/useEditorLayout";
import FloatingInput from "./FloatingInput";
import {
  diameterRowGeometry,
  heightRowGeometry,
} from "./geometry";
import {
  CIRC_LABEL_GAP_PX,
  LABEL_INPUT_W_PX,
  type SectionMeta,
  sectionInputY,
} from "./layout";

const SectionLabels = () => {
  const layout = useEditorLayoutCtx();
  const { sectionMeta, diameterLabelX, heightLabelX, silhouetteScale, silhouetteY } =
    layout;
  const setDiameter = useToyStore((s) => s.setDiameter);
  const setHeight = useToyStore((s) => s.setHeight);
  const setCircumference = useToyStore((s) => s.setCircumference);
  const showSectionCirc = useToyStore((s) => s.showSectionCircumference);
  const circumferenceX = diameterLabelX + LABEL_INPUT_W_PX + CIRC_LABEL_GAP_PX;

  return (
    <>
      {sectionMeta.map((meta) => (
        <HeightRow
          key={`h-${meta.section.id}`}
          meta={meta}
          layout={layout}
          x={heightLabelX}
          onChange={(mm) => mm != null && setHeight(meta.section.id, mm)}
        />
      ))}

      {sectionMeta.map((meta) => (
        <DiameterRow
          key={`d-${meta.section.id}`}
          meta={meta}
          layout={layout}
          x={diameterLabelX}
          onChange={(mm) => mm != null && setDiameter(meta.section.id, mm)}
        />
      ))}

      {showSectionCirc &&
        sectionMeta.map((meta) => (
          <FloatingInput
            key={`c-${meta.section.id}`}
            x={circumferenceX}
            yCenter={sectionInputY(meta, silhouetteScale, silhouetteY)}
            prefix="C"
            ariaLabel={`Circumference of section ${meta.index + 1}`}
            value={meta.section.circumference ?? null}
            touched={meta.section.circumference != null}
            allowEmpty
            placeholder="—"
            onChange={(v) => setCircumference(meta.section.id, v)}
          />
        ))}
    </>
  );
};

type RowProps = {
  meta: SectionMeta;
  layout: EditorLayout;
  x: number;
  onChange: (mm: number | null) => void;
};

const HeightRow = ({ meta, layout, x, onChange }: RowProps) => {
  const touched = meta.section.touched?.height ?? true;
  const { yMid, leaderD } = heightRowGeometry(meta, layout, x);
  return (
    <g>
      <path
        className={`cone-editor-leader ${touched ? "is-touched" : "is-default"}`}
        d={leaderD}
      />
      <FloatingInput
        x={x}
        yCenter={yMid}
        prefix="H"
        ariaLabel={`Height of section ${meta.index + 1}`}
        value={meta.section.height}
        touched={touched}
        onChange={onChange}
      />
    </g>
  );
};

const DiameterRow = ({ meta, layout, x, onChange }: RowProps) => {
  const knownSizeMm = useToyStore((s) => s.knownSizeMm);
  const touched = meta.section.touched?.diameter ?? true;
  const { inputY, leaderD } = diameterRowGeometry(meta, layout, x);
  const overshoots =
    knownSizeMm != null && meta.section.diameter > knownSizeMm + 0.5;
  return (
    <g>
      <path
        className={`cone-editor-leader ${touched ? "is-touched" : "is-default"}`}
        d={leaderD}
      />
      <FloatingInput
        x={x}
        yCenter={inputY}
        width={LABEL_INPUT_W_PX + (overshoots ? 18 : 0)}
        prefix="Ø"
        ariaLabel={`Diameter of section ${meta.index + 1}`}
        value={meta.section.diameter}
        touched={touched}
        onChange={onChange}
        trailing={
          overshoots && (
            <span
              className="cone-editor-floating-warn"
              title="Section is wider than the known size guide"
              aria-label="Section exceeds the known size guide"
            >
              ⚠
            </span>
          )
        }
      />
    </g>
  );
};

export default SectionLabels;
