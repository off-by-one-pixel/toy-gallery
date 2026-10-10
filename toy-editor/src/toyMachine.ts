import type { RefObject } from "react";
import { create } from "zustand";

export type StyleOption = {
  borderWidth: number;
  borderColor: string;
  color: string;
};

export type ToyTouched = {
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

export const sectionTopCurveAngle = (s: ToySection): CurveAngle =>
  s.topCurveAngle ?? DEFAULT_TOP_CURVE_ANGLE;
export const sectionBottomCurveAngle = (s: ToySection): CurveAngle =>
  s.bottomCurveAngle ?? DEFAULT_BOTTOM_CURVE_ANGLE;

export const Shape = {
  CONE: "CONE",
  EGG: "EGG",
  FLAT: "FLAT",
  SPIKE: "SPIKE",
} as const;
export type Shape = (typeof Shape)[keyof typeof Shape];

export interface Toy {
  sections: ToySection[];
  topShape: Shape;
  bottomShape: Shape;
  ref?: RefObject<SVGSVGElement | null>;
  insertableLengthMm?: number | null;
  knownTotalMm?: number | null;
  knownSizeMm?: number | null;
  snapEnabled?: boolean;
}

interface ToyStore extends Toy {
  scaleFactor: number;
  nextId: number;
  style: StyleOption;
  selectedId: number | null;

  insertableLengthMm: number | null;
  knownTotalMm: number | null;
  knownSizeMm: number | null;
  snapEnabled: boolean;
  showSectionCircumference: boolean;

  getMaxWidth: () => number;
  getTotalHeight: () => number;
  newSection: () => void;
  removeSection: (id: number) => void;
  getPreviousDiameter: (id: number) => number;
  getXOffset: (id: number) => number;
  getYOffset: (id: number) => number;
  getToy: () => Toy;

  setDiameter: (id: number, diameter: number) => void;
  setHeight: (id: number, height: number) => void;
  setCircumference: (id: number, circumference: number | null) => void;
  setSectionColor: (id: number, color: string | null) => void;

  setBoundaryDelta: (aboveId: number, delta: number) => void;

  setTopShape: (shape: Shape) => void;
  setBottomShape: (shape: Shape) => void;
  setTopCurveAngle: (id: number, angle: CurveAngle) => void;
  setBottomCurveAngle: (id: number, angle: CurveAngle) => void;
  cycleTopCurveAngle: (id: number) => void;
  cycleBottomCurveAngle: (id: number) => void;
  moveSection: (id: number, direction: number) => void;
  reorderSection: (fromId: number, toId: number, position: "before" | "after") => void;
  setStyle: (style: Partial<StyleOption>) => void;
  setRef: (ref: RefObject<SVGSVGElement | null>) => void;
  setSelected: (id: number | null) => void;

  setInsertableLength: (mm: number | null) => void;
  setKnownTotal: (mm: number | null) => void;
  setKnownSize: (mm: number | null) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setShowSectionCircumference: (v: boolean) => void;

  hydrate: (toy: Toy) => void;
}

const MIN_SECTION_HEIGHT = 1;
const FULL_TOUCHED: ToyTouched = { diameter: true, height: true };
const FRESH_TOUCHED: ToyTouched = { diameter: false, height: false };

const withTouched = (s: ToySection, touched: Partial<ToyTouched>): ToySection => ({
  ...s,
  touched: { ...(s.touched ?? FULL_TOUCHED), ...touched },
});

export const useToyStore = create<ToyStore>()((set, get) => ({
  sections: [{ id: 0, diameter: 100, height: 50, touched: { ...FRESH_TOUCHED } }],
  style: {
    borderWidth: 2,
    borderColor: "#000",
    color: "lightblue",
  },
  scaleFactor: 1,
  topShape: Shape.CONE,
  bottomShape: Shape.FLAT,
  ref: undefined,
  nextId: 1,
  selectedId: null,

  insertableLengthMm: null,
  knownTotalMm: null,
  knownSizeMm: null,
  snapEnabled: true,
  showSectionCircumference: false,

  setRef: (r) => set({ ref: r }),
  setSelected: (id) => set({ selectedId: id }),
  getMaxWidth: () => {
    const widths = get().sections.map((r) => r.diameter);
    return Math.max(...widths, 0);
  },
  getTotalHeight: () => {
    return get()
      .sections.map((r) => r.height)
      .reduce((a, b) => a + b, 0);
  },
  newSection: () => {
    const id = get().nextId;
    set((state) => ({
      nextId: id + 1,
      sections: [
        ...state.sections,
        { id, diameter: 100, height: 50, touched: { ...FRESH_TOUCHED } },
      ],
    }));
  },
  removeSection: (id) => {
    set((state) => ({
      sections: state.sections.filter((section) => section.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
  },
  getPreviousDiameter: (id) => {
    const sections = get().sections;
    const index = sections.findIndex((section) => section.id === id);
    if (index > 0) return sections[index - 1].diameter;
    return sections[index]?.diameter ?? 0;
  },
  getXOffset: (id) => {
    const sections = get().sections;
    const index = sections.findIndex((section) => section.id === id);
    const maxWidth = get().getMaxWidth();
    const diameter = sections[index].diameter;
    if (index > 0) {
      return (maxWidth - Math.max(diameter, get().getPreviousDiameter(id))) / 2;
    }
    return diameter / 2;
  },
  getYOffset: (id) => {
    const sections = get().sections;
    const index = sections.findIndex((section) => section.id === id);
    if (index > 0) {
      return sections.slice(0, index).reduce((sum, s) => sum + s.height, 0);
    }
    return 0;
  },
  getToy: () => ({
    sections: get().sections,
    topShape: get().topShape,
    bottomShape: get().bottomShape,
    ref: get().ref,
    insertableLengthMm: get().insertableLengthMm,
    knownTotalMm: get().knownTotalMm,
    knownSizeMm: get().knownSizeMm,
    snapEnabled: get().snapEnabled,
  }),
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
      sections: state.sections.map((section) =>
        section.id === id ? { ...section, circumference } : section,
      ),
    }));
  },
  setSectionColor: (id, color) => {
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === id ? { ...section, color } : section,
      ),
    }));
  },
  setBoundaryDelta: (aboveId, delta) => {
    set((state) => {
      const idx = state.sections.findIndex((s) => s.id === aboveId);
      if (idx < 0 || idx >= state.sections.length - 1) return {};
      const above = state.sections[idx];
      const below = state.sections[idx + 1];
      const newAbove = above.height + delta;
      const newBelow = below.height - delta;
      if (newAbove < MIN_SECTION_HEIGHT || newBelow < MIN_SECTION_HEIGHT) return {};
      return {
        sections: state.sections.map((s, i) => {
          if (i === idx) return withTouched({ ...s, height: newAbove }, { height: true });
          if (i === idx + 1) return withTouched({ ...s, height: newBelow }, { height: true });
          return s;
        }),
      };
    });
  },
  setTopShape: (shape) => set({ topShape: shape }),
  setBottomShape: (shape) => set({ bottomShape: shape }),
  setTopCurveAngle: (id, angle) => {
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === id ? { ...section, topCurveAngle: angle } : section,
      ),
    }));
  },
  setBottomCurveAngle: (id, angle) => {
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === id ? { ...section, bottomCurveAngle: angle } : section,
      ),
    }));
  },
  cycleTopCurveAngle: (id) => {
    const section = get().sections.find((s) => s.id === id);
    if (!section) return;
    get().setTopCurveAngle(id, nextCurveAngle(sectionTopCurveAngle(section)));
  },
  cycleBottomCurveAngle: (id) => {
    const section = get().sections.find((s) => s.id === id);
    if (!section) return;
    get().setBottomCurveAngle(id, nextCurveAngle(sectionBottomCurveAngle(section)));
  },
  moveSection: (id, direction) => {
    const index = get().sections.findIndex((section) => section.id === id);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= get().sections.length) return;
    const newSections = [...get().sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    set({ sections: newSections });
  },
  reorderSection: (fromId, toId, position) => {
    set((state) => {
      if (fromId === toId) return {};
      const sections = [...state.sections];
      const fromIdx = sections.findIndex((s) => s.id === fromId);
      let toIdx = sections.findIndex((s) => s.id === toId);
      if (fromIdx < 0 || toIdx < 0) return {};
      const [item] = sections.splice(fromIdx, 1);
      if (fromIdx < toIdx) toIdx -= 1;
      const insertIdx = position === "before" ? toIdx : toIdx + 1;
      sections.splice(insertIdx, 0, item);
      return { sections };
    });
  },
  setStyle: (style) => set({ style: { ...get().style, ...style } }),
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
      selectedId: null,
      insertableLengthMm: toy.insertableLengthMm ?? null,
      knownTotalMm: toy.knownTotalMm ?? null,
      knownSizeMm: toy.knownSizeMm ?? null,
      snapEnabled: toy.snapEnabled ?? true,
      showSectionCircumference: toy.sections.some((s) => s.circumference != null),
    });
  },
}));
