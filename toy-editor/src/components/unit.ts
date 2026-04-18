import { createContext, useContext } from "react";

export type Unit = "mm" | "in";

export const EditorUnitContext = createContext<Unit>("mm");

export const useEditorUnit = (): Unit => useContext(EditorUnitContext);
