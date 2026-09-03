import { createContext, useContext } from "react";

export type PaletteColor = {
  name: string;
  value: string;
};

export const EditorPaletteContext = createContext<readonly PaletteColor[]>([]);

export const useEditorPalette = () => useContext(EditorPaletteContext);
