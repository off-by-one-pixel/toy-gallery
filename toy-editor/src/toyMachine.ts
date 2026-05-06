import type { RefObject } from "react";
import { create } from "zustand";

export type StyleOption = {
  borderWidth: number;
  borderColor: string;
  color: string;
};

/**
 * Tracks whether each numeric value on a section was set by the user
 * (true) or is still a template default that hasn't been touched yet
 * (false). Used purely as a visual cue (bold vs. lighter typography);
 * has no behavioral effect — we never auto-rescale.
 */
export type ToyTouched = {
  diameter: boolean;
  height: boolean;
};

export interface ToySection {
  id: number;
  diameter: number;
  height: number;
  /** Optional measured circumference in the same units as diameter.
   *  Preserved for backward compatibility with consumers that persist it
   *  per-section (notably the toy_gallery_be backend). */
  circumference?: number | null;
  /** Visual-only flag: was each dimension touched by the user? Defaults to
   *  fully touched on hydrate (loaded toys are by definition user-set) and
   *  fully untouched for sections inserted from scratch. */
  touched?: ToyTouched;
}

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
  /** Manufacturer-stated insertable length. Reuses the persisted
   *  `insertable_length` field on the toy. Drawn as a horizontal reference
   *  guide on the canvas. */
  insertableLengthMm?: number | null;
  /** Manufacturer-stated total length. Session-only — not persisted. */
  knownTotalMm?: number | null;
  /** Manufacturer-stated size, expressed as a canonical diameter
   *  (= circumference / π for inputs typed in circumference). Session-only
   *  — not persisted. */
  knownSizeMm?: number | null;
  snapEnabled?: boolean;
}

interface ToyStore extends Toy {
  scaleFactor: number;
  nextId: number;
  style: StyleOption;
  selectedId: number | null;

  // Reference guide state (always defined inside the store; the optional
  // markers on Toy are for the public API surface).
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

  // Section value setters — typing or dragging marks the dimension as user-touched.
  setDiameter: (id: number, diameter: number) => void;
  setHeight: (id: number, height: number) => void;
  setCircumference: (id: number, circumference: number | null) => void;

  /**
   * Move the boundary between two sections. `aboveId` is the section above
   * the boundary; `delta` is the change in mm (positive = boundary moves
   * down, growing the upper section and shrinking the one below).
   * Both adjacent sections are marked height-touched.
   */
  setBoundaryDelta: (aboveId: number, delta: number) => void;

  setTopShape: (shape: Shape) => void;
  setBottomShape: (shape: Shape) => void;
  moveSection: (id: number, direction: number) => void;
  reorderSection: (fromId: number, toId: number, position: "before" | "after") => void;
  setStyle: (style: Partial<StyleOption>) => void;
  setRef: (ref: RefObject<SVGSVGElement | null>) => void;
  setSelected: (id: number | null) => void;

  // Reference guides + snap
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
  setBoundaryDelta: (aboveId, delta) => {
    set((state) => {
      const idx = state.sections.findIndex((s) => s.id === aboveId);
      if (idx < 0 || idx >= state.sections.length - 1) return {};
      const above = state.sections[idx];
      const below = state.sections[idx + 1];
      const newAbove = above.height + delta;
      const newBelow = below.height - delta;
      // Refuse adjustments that would push either section below the floor
      // — drag is purely geometric and we don't want to silently absorb the
      // overflow somewhere else.
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
      // Hydrated sections are by definition user-set (they were saved),
      // so default `touched` to fully true unless the caller explicitly
      // marked them otherwise.
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
