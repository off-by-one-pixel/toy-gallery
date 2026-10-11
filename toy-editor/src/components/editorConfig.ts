import { createContext, useContext } from 'react';
import type { ToyEditorLabels } from './editor/labels';

export type Unit = { id: string; factor: number; decimals: number };

export type PaletteColor = {
  name: string;
  value: string;
};

export type EditorConfig = {
  unit: Unit;
  labels: ToyEditorLabels;
  palette: readonly PaletteColor[];
};

export const EditorConfigContext = createContext<EditorConfig | null>(null);

export const useEditorConfig = (): EditorConfig => {
  const config = useContext(EditorConfigContext);
  if (!config) throw new Error('useEditorConfig must be used within an EditorConfigContext.Provider');
  return config;
};
