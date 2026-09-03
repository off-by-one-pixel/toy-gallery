import { createContext, useContext, type ReactNode } from "react";
import type { EditorLayout } from "./hooks/useEditorLayout";

const EditorLayoutContext = createContext<EditorLayout | null>(null);

export const EditorLayoutProvider = ({
  value,
  children,
}: {
  value: EditorLayout;
  children: ReactNode;
}) => (
  <EditorLayoutContext.Provider value={value}>
    {children}
  </EditorLayoutContext.Provider>
);

export const useEditorLayoutCtx = (): EditorLayout => {
  const v = useContext(EditorLayoutContext);
  if (!v) {
    throw new Error(
      "useEditorLayoutCtx must be used inside <EditorLayoutProvider>",
    );
  }
  return v;
};
