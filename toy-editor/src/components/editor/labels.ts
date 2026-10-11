import { createContext, useContext } from 'react';
import type { Shape } from '../../toyMachine';

export type ToyEditorLabels = {
  knownMeasurements: string;
  insertable: string;
  total: string;
  circumference: string;
  snap: string;
  sectionCircumferences: string;
  topShape: string;
  bottomShape: string;
  shapes: Record<Shape, string>;
  addSection: string;
  addReferenceImage: string;
  removeReferenceImage: string;
  referenceImageFile: string;
  resizeReferenceImage: string;
  insertableGuide: (length: string) => string;
  totalGuide: (length: string) => string;
  totalReadout: (length: string) => string;
  heightPrefix: string;
  circumferencePrefix: string;
  sectionHeight: (section: number) => string;
  sectionDiameter: (section: number) => string;
  sectionCircumference: (section: number) => string;
  sectionTooWide: string;
  sectionTopAngle: (section: number, degrees: number) => string;
  sectionBottomAngle: (section: number, degrees: number) => string;
  removeSection: (section: number) => string;
  sectionColor: (section: number) => string;
  sectionColorPalette: string;
  toyColor: string;
  customColor: string;
};

export const EditorLabelsContext = createContext<ToyEditorLabels | null>(null);

export const useEditorLabels = (): ToyEditorLabels => {
  const labels = useContext(EditorLabelsContext);
  if (!labels) throw new Error('useEditorLabels must be used within an EditorLabelsContext.Provider');
  return labels;
};
