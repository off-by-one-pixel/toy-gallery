import { createContext, useContext } from "react";

export type Unit = { id: string; factor: number; decimals: number };

export const EditorUnitContext = createContext<Unit | null>(null);

export const useEditorUnit = (): Unit => {
  const unit = useContext(EditorUnitContext);
  if (!unit) throw new Error("useEditorUnit must be used within an EditorUnitContext.Provider");
  return unit;
};
