import type { Toy as EditorToy, ToySection } from 'toy-editor';
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

export function editorStateFromToy(toy: EditorToy): EditorState {
  return {
    sections: toy.sections,
    topShape: toy.topShape,
    bottomShape: toy.bottomShape,
    insertableLengthMm: toy.insertableLengthMm ?? null,
    knownTotalMm: toy.knownTotalMm ?? null,
    knownSizeMm: toy.knownSizeMm ?? null,
  };
}

const DEFAULT_TOP_CURVE_ANGLE = 0;
const DEFAULT_BOTTOM_CURVE_ANGLE = 180;

function editorFingerprint(state: EditorState): string {
  return JSON.stringify({
    topShape: state.topShape,
    bottomShape: state.bottomShape,
    insertableLengthMm: state.insertableLengthMm,
    knownTotalMm: state.knownTotalMm,
    knownSizeMm: state.knownSizeMm,
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

export function isEditorStateEqual(a: EditorState, b: EditorState): boolean {
  return editorFingerprint(a) === editorFingerprint(b);
}
