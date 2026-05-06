import type { ReactNode } from "react";
import { formatMm, parseMm } from "../../util/fmt";
import { useEditorUnit } from "../unit";
import { LABEL_INPUT_H_PX, LABEL_INPUT_W_PX } from "./layout";

type Props = {
  /** Top-left x of the foreignObject (the input column anchor). */
  x: number;
  /** Vertical CENTER y of the input. The component subtracts half the
   *  input height to position the foreignObject. */
  yCenter: number;
  /** Width of the foreignObject. Defaults to `LABEL_INPUT_W_PX`. */
  width?: number;
  /** Short prefix glyph rendered before the input (Ø / C / H). */
  prefix: string;
  ariaLabel: string;
  /** Canonical mm value (or null when unset). */
  value: number | null;
  /** Whether the user has set this value — drives bold vs muted styling. */
  touched: boolean;
  /** When true, an empty input commits as `null` (used for the optional
   *  per-section circumference field). When false, the input cannot be
   *  cleared (used for required fields like diameter and height). */
  allowEmpty?: boolean;
  /** Placeholder shown when the input is empty. */
  placeholder?: string;
  /** Optional element rendered after the input (e.g. an overshoot ⚠ icon). */
  trailing?: ReactNode;
  onChange: (mm: number | null) => void;
};

/** A reusable `<foreignObject>` + `cone-editor-floating` `<div>` + `<input>`
 *  used by the height / diameter / circumference per-section labels.
 *  Centralises mm⇄unit formatting, parsing, and the touched-vs-default
 *  visual cue. */
const FloatingInput = ({
  x,
  yCenter,
  width = LABEL_INPUT_W_PX,
  prefix,
  ariaLabel,
  value,
  touched,
  allowEmpty = false,
  placeholder,
  trailing,
  onChange,
}: Props) => {
  const unit = useEditorUnit();
  const display = formatMm(value, unit);
  const stateClass = touched ? "is-touched" : "is-default";
  return (
    <foreignObject
      x={x}
      y={yCenter - LABEL_INPUT_H_PX / 2}
      width={width}
      height={LABEL_INPUT_H_PX}
    >
      <div
        className={`cone-editor-floating ${stateClass}`}
        style={{ width: "100%", height: "100%" }}
      >
        <span className="cone-editor-floating-prefix">{prefix}</span>
        <input
          type="number"
          aria-label={ariaLabel}
          step={10 ** -unit.decimals}
          min={0}
          value={display}
          placeholder={placeholder}
          onChange={(e) => {
            const parsed = parseMm(e.target.value, unit);
            if (parsed === undefined) return;
            if (parsed === null && !allowEmpty) return;
            onChange(parsed);
          }}
          onClick={(e) => e.stopPropagation()}
        />
        {trailing}
      </div>
    </foreignObject>
  );
};

export default FloatingInput;
