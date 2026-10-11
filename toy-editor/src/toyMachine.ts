import { create } from 'zustand';
import { combine } from 'zustand/middleware';

export type StyleOption = {
  borderWidth: number;
  borderColor: string;
  color: string;
};

type ToyTouched = {
  diameter: boolean;
  height: boolean;
};

export const CURVE_ANGLES = [0, 45, 90, 135, 180] as const;
export type CurveAngle = (typeof CURVE_ANGLES)[number];
export const DEFAULT_TOP_CURVE_ANGLE: CurveAngle = 0;
export const DEFAULT_BOTTOM_CURVE_ANGLE: CurveAngle = 180;

export const nextCurveAngle = (p: CurveAngle): CurveAngle =>
  CURVE_ANGLES[(CURVE_ANGLES.indexOf(p) + 1) % CURVE_ANGLES.length];

export interface ToySection {
  id: number;
  diameter: number;
  height: number;
  color?: string | null;
  circumference?: number | null;
  touched?: ToyTouched;
  topCurveAngle?: CurveAngle;
  bottomCurveAngle?: CurveAngle;
}

export const sectionTopCurveAngle = (s: ToySection): CurveAngle => s.topCurveAngle ?? DEFAULT_TOP_CURVE_ANGLE;
export const sectionBottomCurveAngle = (s: ToySection): CurveAngle => s.bottomCurveAngle ?? DEFAULT_BOTTOM_CURVE_ANGLE;

export const Shape = {
  CONE: 'CONE',
  EGG: 'EGG',
  FLAT: 'FLAT',
  SPIKE: 'SPIKE',
} as const;
export type Shape = (typeof Shape)[keyof typeof Shape];

export interface Toy {
  sections: ToySection[];
  topShape: Shape;
  bottomShape: Shape;
  insertableLengthMm?: number | null;
  knownTotalMm?: number | null;
  knownSizeMm?: number | null;
}

type ToyState = Required<Toy> & {
  nextId: number;
  snapEnabled: boolean;
  showSectionCircumference: boolean;
};

const FULL_TOUCHED: ToyTouched = { diameter: true, height: true };

const freshSection = (id: number): ToySection => ({
  id,
  diameter: 100,
  height: 50,
  touched: { diameter: false, height: false },
});

const touch = (section: ToySection, field: keyof ToyTouched): ToyTouched => ({
  ...(section.touched ?? FULL_TOUCHED),
  [field]: true,
});

const initialState: ToyState = {
  sections: [freshSection(0)],
  topShape: Shape.CONE,
  bottomShape: Shape.FLAT,
  nextId: 1,
  insertableLengthMm: null,
  knownTotalMm: null,
  knownSizeMm: null,
  snapEnabled: true,
  showSectionCircumference: false,
};

export const useToyStore = create(
  combine(initialState, (set) => {
    const updateSection = (id: number, patch: (section: ToySection) => Partial<ToySection>) =>
      set((state) => ({ sections: state.sections.map((s) => (s.id === id ? { ...s, ...patch(s) } : s)) }));

    return {
      newSection: () =>
        set((state) => ({ nextId: state.nextId + 1, sections: [...state.sections, freshSection(state.nextId)] })),
      removeSection: (id: number) => set((state) => ({ sections: state.sections.filter((s) => s.id !== id) })),
      setDiameter: (id: number, diameter: number) =>
        updateSection(id, (s) => ({ diameter, touched: touch(s, 'diameter') })),
      setHeight: (id: number, height: number) => updateSection(id, (s) => ({ height, touched: touch(s, 'height') })),
      setCircumference: (id: number, circumference: number | null) => updateSection(id, () => ({ circumference })),
      setSectionColor: (id: number, color: string | null) => updateSection(id, () => ({ color })),
      cycleTopCurveAngle: (id: number) =>
        updateSection(id, (s) => ({ topCurveAngle: nextCurveAngle(sectionTopCurveAngle(s)) })),
      cycleBottomCurveAngle: (id: number) =>
        updateSection(id, (s) => ({ bottomCurveAngle: nextCurveAngle(sectionBottomCurveAngle(s)) })),
      setTopShape: (topShape: Shape) => set({ topShape }),
      setBottomShape: (bottomShape: Shape) => set({ bottomShape }),
      setInsertableLength: (insertableLengthMm: number | null) => set({ insertableLengthMm }),
      setKnownTotal: (knownTotalMm: number | null) => set({ knownTotalMm }),
      setKnownSize: (knownSizeMm: number | null) => set({ knownSizeMm }),
      setSnapEnabled: (snapEnabled: boolean) => set({ snapEnabled }),
      setShowSectionCircumference: (showSectionCircumference: boolean) => set({ showSectionCircumference }),
      hydrate: (toy: Toy) =>
        set({
          sections: toy.sections.map((s) => ({ ...s, touched: s.touched ?? { ...FULL_TOUCHED } })),
          topShape: toy.topShape,
          bottomShape: toy.bottomShape,
          nextId: toy.sections.reduce((max, s) => Math.max(max, s.id), 0) + 1,
          insertableLengthMm: toy.insertableLengthMm ?? null,
          knownTotalMm: toy.knownTotalMm ?? null,
          knownSizeMm: toy.knownSizeMm ?? null,
          snapEnabled: true,
          showSectionCircumference: toy.sections.some((s) => s.circumference != null),
        }),
    };
  }),
);
