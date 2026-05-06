import { create } from "zustand";

type EditorUiStore = {
  hoveredSectionId: number | null;
  setHoveredSectionId: (id: number | null) => void;
};

export const useEditorUiStore = create<EditorUiStore>((set) => ({
  hoveredSectionId: null,
  setHoveredSectionId: (id) => set({ hoveredSectionId: id }),
}));
