import { DEFAULT_BOTTOM_CURVE_ANGLE, DEFAULT_TOP_CURVE_ANGLE, type ToySection } from 'toy-editor';
import { type SectionShape, type ToyPayload } from '@/api/types';
import { diameterToCircumference } from '@/features/preferences/units';

export type EditorState = Readonly<{
  sections: readonly ToySection[];
  topShape: SectionShape;
  bottomShape: SectionShape;
  insertableLengthMm: number | null;
  knownTotalMm: number | null;
  knownSizeMm: number | null;
}>;

type ToyIdentity = Readonly<{
  brand: string;
  name: string;
  size: string;
  color: string;
}>;

type PayloadInput = Readonly<{
  state: EditorState;
  identity: ToyIdentity;
  extras?: Partial<ToyPayload>;
}>;

export function editorToPayload({ state, identity, extras }: PayloadInput): ToyPayload {
  return {
    ...identity,
    insertableLength: state.insertableLengthMm,
    totalLength: state.knownTotalMm,
    circumference: diameterToCircumference(state.knownSizeMm),
    shape: {
      topSectionShape: state.topShape,
      bottomSectionShape: state.bottomShape,
      sections: state.sections.map(({ id: _id, touched: _touched, ...s }, idx) => ({
        ...s,
        order: idx,
        circumference: s.circumference ?? null,
      })),
    },
    ...extras,
  };
}

export function editorToTemplateJson(state: EditorState): string {
  const entry = {
    id: '',
    name: '',
    description: '',
    totalLength: state.knownTotalMm,
    insertableLength: state.insertableLengthMm,
    circumference: diameterToCircumference(state.knownSizeMm),
    shape: {
      topSectionShape: state.topShape,
      bottomSectionShape: state.bottomShape,
      sections: state.sections.map((s, idx) => ({
        id: s.id,
        order: idx,
        diameter: s.diameter,
        height: s.height,
        color: s.color ?? undefined,
        topCurveAngle: s.topCurveAngle,
        bottomCurveAngle: s.bottomCurveAngle,
      })),
    },
  };
  return JSON.stringify(entry, null, 2);
}

type ComparableEditorState = Pick<EditorState, 'sections' | 'topShape' | 'bottomShape'> & Partial<EditorState>;

function editorFingerprint(state: ComparableEditorState): string {
  return JSON.stringify({
    topShape: state.topShape,
    bottomShape: state.bottomShape,
    insertableLengthMm: state.insertableLengthMm ?? null,
    knownTotalMm: state.knownTotalMm ?? null,
    knownSizeMm: state.knownSizeMm ?? null,
    sections: state.sections.map((s) => ({
      diameter: s.diameter,
      height: s.height,
      color: s.color ?? null,
      circumference: s.circumference ?? null,
      topCurveAngle: s.topCurveAngle ?? DEFAULT_TOP_CURVE_ANGLE,
      bottomCurveAngle: s.bottomCurveAngle ?? DEFAULT_BOTTOM_CURVE_ANGLE,
    })),
  });
}

export function isEditorStateEqual(a: ComparableEditorState, b: ComparableEditorState): boolean {
  return editorFingerprint(a) === editorFingerprint(b);
}
