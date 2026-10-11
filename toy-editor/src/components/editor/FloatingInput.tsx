import { useState, type ReactNode } from 'react';
import { formatMm, parseMm } from '../../util/fmt';
import { useEditorConfig } from '../editorConfig';
import { LABEL_INPUT_H_PX, LABEL_INPUT_W_PX } from './layout';

type Props = {
  x: number;
  yCenter: number;
  width?: number;
  prefix: string;
  ariaLabel: string;
  value: number | null;
  touched: boolean;
  allowEmpty?: boolean;
  placeholder?: string;
  trailing?: ReactNode;
  onChange: (mm: number | null) => void;
};

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
  const { unit } = useEditorConfig();
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? formatMm(value, unit);
  const stateClass = touched ? 'is-touched' : 'is-default';
  return (
    <foreignObject x={x} y={yCenter - LABEL_INPUT_H_PX / 2} width={width} height={LABEL_INPUT_H_PX}>
      <div className={`toy-editor-floating ${stateClass}`} style={{ width: '100%', height: '100%' }}>
        <span className="toy-editor-floating-prefix">{prefix}</span>
        <input
          type="text"
          inputMode="decimal"
          aria-label={ariaLabel}
          value={display}
          placeholder={placeholder}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            const parsed = parseMm(raw, unit);
            if (parsed === undefined) return;
            if (parsed === null && !allowEmpty) return;
            onChange(parsed);
          }}
          onBlur={() => setDraft(null)}
          onClick={(e) => e.stopPropagation()}
        />
        {trailing}
      </div>
    </foreignObject>
  );
};

export default FloatingInput;
