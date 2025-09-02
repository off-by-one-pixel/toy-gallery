import { create } from "zustand";
import { RefObject } from "react";

export type StyleOption = {
  borderWidth: number;
  borderColor: string;
  color: string;
}

export interface ToySection {
  id: number;
  diameter: number;
  height: number;
}

type Shapes = "cone" | "egg" | "flat" | "spike";

export interface Toy {
  sections: ToySection[];
  topShape: Shapes;
  bottomShape: Shapes;
  ref?: RefObject<null>;
}

interface ToyMachineState extends Toy {
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
  setTopShape: (shape: Shapes) => void;
  setBottomShape: (shape: Shapes) => void;
  moveSection: (id: number, direction: number) => void;
  setStyle: (style: StyleOption) => void;
  setRef: (ref: RefObject<null>) => void;
}

export const useToyStore = create<ToyMachineState>()((set, get) => ({
  sections: [
    { id: 0, diameter: 100, height: 50 },
  ],
  style: {
    borderWidth: 2,
    borderColor: "#000",
    color: "lightblue"
  },
  scaleFactor: 1,
  topShape: "cone",
  bottomShape: "flat",
  ref: undefined,
  nextId: 1,
  setRef: (r) => {
    set({ref: r})
  },
  getMaxWidth: () => {
    const widths = get().sections.map((r) => r.diameter);
    return Math.max(...widths, 0);
  },
  getTotalHeight: () => {
    const heights = get().sections.map((r) => r.height);
    return heights.reduce((a, b) => a + b, 0);
  },
  newSection: () => {
    const id = get().nextId;
    set({ nextId: id + 1 });
    set((state) => ({
      sections: [
        ...state.sections,
        { id, diameter: 100, height: 50 },
      ],
    }));
  },
  removeSection: (id: number) => {
    set((state) => ({
      sections: state.sections.filter(
        (section) => section.id !== id,
      ),
    }));
  },
  getPreviousDiameter: (id: number) => {
    const sections = get().sections;
    const index = sections.findIndex((section) => section.id === id);
    if (index > 0) {
      return sections[index - 1].diameter;
    }
    return sections[index].diameter;
  },
  getXOffset: (id: number) => {
    const sections = get().sections;
    const index = sections.findIndex((section) => section.id === id);
    const maxWidth = get().getMaxWidth();
    const diameter = sections[index].diameter;
    if (index > 0) {
      return (maxWidth - Math.max(diameter, get().getPreviousDiameter(id))) / 2;
    }
    return diameter / 2;
  },
  getYOffset: (id: number) => {
    const sections = get().sections;
    const index = sections.findIndex((section) => section.id === id);
    if (index > 0) {
      return sections
        .slice(0, index)
        .reduce((sum, s) => sum + s.height, 0);
    }
    return 0;
  },
  getToy: () => {
    return {
      sections: get().sections,
      topShape: get().topShape,
      bottomShape: "flat",
      ref: get().ref
    };
  },
  setDiameter: (id: number, diameter: number) => {
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === id ? { ...section, diameter } : section,
      ),
    }));
  },
  setHeight: (id: number, height: number) => {
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === id ? { ...section, height } : section,
      ),
    }));
  },
  setTopShape: (shape: Shapes) => {
    set({ topShape: shape });
  },
  setBottomShape: (shape: Shapes) => {
    set({ bottomShape: shape });
  },
  moveSection(id, direction) {
    const index = get().sections.findIndex((section) => section.id === id);
    const newIndex = index + direction;
    const newSections = [...get().sections];
    if (newIndex >= 0 && newIndex < get().sections.length) {
      [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
      set({ sections: newSections });
    }
  },
  setStyle(style) {
    set({style: {...get().style, ...style}})
  }
}));