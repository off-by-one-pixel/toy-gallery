import { type ChangeEvent, useState } from 'react';
import { formatMm, parseMm } from '../../../util/fmt';
import { useEditorConfig } from '../../editorConfig';

export const useMmInput = (mm: number | null, onChange: (mm: number | null) => void) => {
  const { unit } = useEditorConfig();
  const [draft, setDraft] = useState<string | null>(null);
  return {
    type: 'text',
    inputMode: 'decimal' as const,
    value: draft ?? formatMm(mm, unit),
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setDraft(e.target.value);
      const parsed = parseMm(e.target.value, unit);
      if (parsed !== undefined) onChange(parsed);
    },
    onBlur: () => setDraft(null),
  };
};
