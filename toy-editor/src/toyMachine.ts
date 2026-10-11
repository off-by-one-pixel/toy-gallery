import { create } from 'zustand';

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

interface ToyStore extends Toy {
  nextId: number;

  insertableLengthMm: number | null;
  knownTotalMm: number | null;
  knownSizeMm: number | null;
  snapEnabled: boolean;
  showSectionCircumference: boolean;

  newSection: () => void;
  removeSection: (id: number) => void;

  setDiameter: (id: number, diameter: number) => void;
  setHeight: (id: number, height: number) => void;
  setCircumference: (id: number, circumference: number | null) => void;
  setSectionColor: (id: number, color: string | null) => void;

  setTopShape: (shape: Shape) => void;
  setBottomShape: (shape: Shape) => void;
  cycleTopCurveAngle: (id: number) => void;
  cycleBottomCurveAngle: (id: number) => void;

  setInsertableLength: (mm: number | null) => void;
  setKnownTotal: (mm: number | null) => void;
  setKnownSize: (mm: number | null) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setShowSectionCircumference: (v: boolean) => void;

  hydrate: (toy: Toy) => void;
}

const FULL_TOUCHED: ToyTouched = { diameter: true, height: true };
const FRESH_TOUCHED: ToyTouched = { diameter: false, height: false };

const withTouched = (s: ToySection, touched: Partial<ToyTouched>): ToySection => ({
  ...s,
  touched: { ...(s.touched ?? FULL_TOUCHED), ...touched },
});

export const useToyStore = create<ToyStore>()((set, get) => ({
  sections: [{ id: 0, diameter: 100, height: 50, touched: { ...FRESH_TOUCHED } }],
  topShape: Shape.CONE,
  bottomShape: Shape.FLAT,
  nextId: 1,

  insertableLengthMm: null,
  knownTotalMm: null,
  knownSizeMm: null,
  snapEnabled: true,
  showSectionCircumference: false,

  newSection: () => {
    const id = get().nextId;
    set((state) => ({
      nextId: id + 1,
      sections: [...state.sections, { id, diameter: 100, height: 50, touched: { ...FRESH_TOUCHED } }],
    }));
  },
  removeSection: (id) => {
    set((state) => ({
      sections: state.sections.filter((section) => section.id !== id),
    }));
  },
  setDiameter: (id, diameter) => {
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === id ? withTouched({ ...section, diameter }, { diameter: true }) : section,
      ),
    }));
  },
  setHeight: (id, height) => {
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === id ? withTouched({ ...section, height }, { height: true }) : section,
      ),
    }));
  },
  setCircumference: (id, circumference) => {
    set((state) => ({
      sections: state.sections.map((section) => (section.id === id ? { ...section, circumference } : section)),
    }));
  },
  setSectionColor: (id, color) => {
    set((state) => ({
      sections: state.sections.map((section) => (section.id === id ? { ...section, color } : section)),
    }));
  },
  setTopShape: (shape) => set({ topShape: shape }),
  setBottomShape: (shape) => set({ bottomShape: shape }),
  cycleTopCurveAngle: (id) => {
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === id ? { ...section, topCurveAngle: nextCurveAngle(sectionTopCurveAngle(section)) } : section,
      ),
    }));
  },
  cycleBottomCurveAngle: (id) => {
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === id
          ? { ...section, bottomCurveAngle: nextCurveAngle(sectionBottomCurveAngle(section)) }
          : section,
      ),
    }));
  },
  setInsertableLength: (mm) => set({ insertableLengthMm: mm }),
  setKnownTotal: (mm) => set({ knownTotalMm: mm }),
  setKnownSize: (mm) => set({ knownSizeMm: mm }),
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  setShowSectionCircumference: (v) => set({ showSectionCircumference: v }),
  hydrate: (toy) => {
    const maxId = toy.sections.reduce((a, s) => Math.max(a, s.id), 0);
    set({
      sections: toy.sections.map((s) => ({
        ...s,
        touched: s.touched ?? { ...FULL_TOUCHED },
      })),
      topShape: toy.topShape,
      bottomShape: toy.bottomShape,
      nextId: maxId + 1,
      insertableLengthMm: toy.insertableLengthMm ?? null,
      knownTotalMm: toy.knownTotalMm ?? null,
      knownSizeMm: toy.knownSizeMm ?? null,
      snapEnabled: true,
      showSectionCircumference: toy.sections.some((s) => s.circumference != null),
    });
  },
}));
