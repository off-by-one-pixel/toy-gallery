import { create } from "zustand";

interface ToySection {
  id: number;
  diameter: number;
  height: number;
  shape: string;
}

interface ToySectionState extends ToySection {
  setDiameter?: (diameter: number) => void;
  setHeight?: (height: number) => void;
  setShape?: (shape: string) => void;
}


const createToySectionStore = (input: ToySection) =>
  create<ToySectionState>((set) => ({
    ...input,
    setDiameter: (diameter: number) => set({ diameter }),
    setHeight: (height: number) => set({ height }),
    setShape: (shape: string) => set({ shape }),
  }));


interface ToyMachineState {
  sections: ReturnType<typeof createToySectionStore>[];
  scaleFactor: number;
  nextId: number;
  getMaxWidth: () => number;
  getTotalHeight: () => number;
  newSection: () => void;
  removeSection: (id: number) => void;
  getPreviousDiameter: (id: number) => number;
  getXOffset: (id: number) => number;
  getYOffset: (id: number) => number;
}

export const useToyStore = create<ToyMachineState>()((set, get) => ({
  sections: [],
  scaleFactor: 1,
  nextId: 0,
  getMaxWidth: () => {
    const widths = get().sections.map(r => r.getState().diameter);
    return Math.max(...widths, 0);
  },
  getTotalHeight: () => {
    const heights = get().sections.map(r => r.getState().height);
    return heights.reduce((a, b) => a + b, 0);
  },
  newSection: () => {
    const id = get().nextId;
    set({ nextId: id + 1 });
    set((state) => (
      {
        sections: [...state.sections, createToySectionStore({ id, diameter: 100, height: 50, shape: 'cone'})]
      }))
  },
  removeSection: (id: number) => {
    set((state) => ({
      sections: state.sections.filter(section => section.getState().id !== id)
    }));
  },
  getPreviousDiameter: (id: number) => {
    const sections = get().sections;
    const index = sections.findIndex(section => section.getState().id === id);
    if (index > 0) {
      return sections[index - 1].getState().diameter;
    }
    return sections[index].getState().diameter;
  },
  getXOffset: (id: number) => {
    const sections = get().sections;
    const index = sections.findIndex(section => section.getState().id === id);
    const maxWidth = get().getMaxWidth();
    const diameter = sections[index].getState().diameter;
    if (index > 0) {
      return (maxWidth - Math.max(diameter, get().getPreviousDiameter(id))) / 2;
    }
    return diameter / 2;
  },
  getYOffset: (id: number) => {
    const sections = get().sections;
    const index = sections.findIndex(section => section.getState().id === id);
    if (index > 0) {
      return sections.slice(0, index).reduce((sum, s) => sum + s.getState().height, 0);
    }
    return 0;
  }
})); 