import type { ToySection } from 'cone-editor';
import { type SectionShape, type ToyPayload } from '../types';
import { diameterToCircumference } from '../units';

/** Snapshot of the cone-editor store's user-visible state, captured at
 *  the point a converter runs. Held read-only by callers so the
 *  converter can't mutate the live store. */
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

/** Build the API request payload from the live editor state plus the
 *  user-entered identification fields. `extras` carries through fields
 *  that aren't part of the editor (`datePurchased`, `retired`,
 *  `customAttributes`) — used by the copy flow to carry source metadata
 *  forward. */
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

/** Serialize the live editor state as a ToyTemplate-shaped JSON entry,
 *  ready to paste into toyTemplates.json. `id`, `name`, and
 *  `description` are blank — authors fill them in after pasting. */
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
        topCurveAngle: s.topCurveAngle,
        bottomCurveAngle: s.bottomCurveAngle,
      })),
    },
  };
  return JSON.stringify(entry, null, 2);
}
