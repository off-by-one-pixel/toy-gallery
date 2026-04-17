import type { RefObject } from "react";
import { create } from "zustand";

export type StyleOption = {
  borderWidth: number;
  borderColor: string;
  color: string;
};

export interface ToySection {
  id: number;
  diameter: number;
  height: number;
}

export type Shape = "cone" | "egg" | "flat" | "spike";

export interface Toy {
  sections: ToySection[];
  topShape: Shape;
  bottomShape: Shape;
  ref?: RefObject<SVGSVGElement | null>;
}

interface ToyStore extends Toy {
  scaleFactor: number;
  nextId: number;
  style: StyleOption;
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
  setTopShape: (shape: Shape) => void;
  setBottomShape: (shape: Shape) => void;
  moveSection: (id: number, direction: number) => void;
  setStyle: (style: Partial<StyleOption>) => void;
  setRef: (ref: RefObject<SVGSVGElement | null>) => void;
}

export const useToyStore = create<ToyStore>()((set, get) => ({
  sections: [{ id: 0, diameter: 100, height: 50 }],
  style: {
    borderWidth: 2,
    borderColor: "#000",
    color: "lightblue",
  },
  scaleFactor: 1,
  topShape: "cone",
  bottomShape: "flat",
  ref: undefined,
  nextId: 1,
  setRef: (r) => set({ ref: r }),
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
      sections: [...state.sections, { id, diameter: 100, height: 50 }],
    }));
  },
  removeSection: (id) => {
    set((state) => ({
      sections: state.sections.filter((section) => section.id !== id),
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
    bottomShape: "flat",
    ref: get().ref,
  }),
  setDiameter: (id, diameter) => {
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === id ? { ...section, diameter } : section,
      ),
    }));
  },
  setHeight: (id, height) => {
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === id ? { ...section, height } : section,
      ),
    }));
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
  setStyle: (style) => set({ style: { ...get().style, ...style } }),
}));
