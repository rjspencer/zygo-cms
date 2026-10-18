import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface EditorUIStateContextValue {
  expandedByIndex: Record<number, boolean>;
  setSectionExpanded: (index: number, expanded: boolean) => void;
  toggleSectionExpanded: (index: number) => void;
  handleMoveSectionExpansion: (from: number, to: number) => void;
  handleRemoveSectionExpansion: (index: number) => void;
  setExpandedMap: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  isTitleEditing: boolean;
  setIsTitleEditing: (editing: boolean) => void;
}

const EditorUIStateContext = createContext<EditorUIStateContextValue | null>(null);

export interface EditorUIStateProviderProps {
  children: React.ReactNode;
  initialTitleEditing?: boolean;
}

export const EditorUIStateProvider: React.FC<EditorUIStateProviderProps> = ({
  children,
  initialTitleEditing = false,
}) => {
  const [expandedByIndex, setExpandedByIndex] = useState<Record<number, boolean>>({});
  const [isTitleEditing, setIsTitleEditing] = useState<boolean>(initialTitleEditing);

  const setSectionExpanded = useCallback((index: number, expanded: boolean) => {
    setExpandedByIndex((prev) => ({
      ...prev,
      [index]: expanded,
    }));
  }, []);

  const toggleSectionExpanded = useCallback((index: number) => {
    setExpandedByIndex((prev) => ({
      ...prev,
      [index]: !(prev[index] ?? true),
    }));
  }, []);

  const handleMoveSectionExpansion = useCallback((from: number, to: number) => {
    setExpandedByIndex((prev) => {
      const fromExpanded = prev[from] ?? true;
      const toExpanded = prev[to] ?? true;
      return {
        ...prev,
        [from]: toExpanded,
        [to]: fromExpanded,
      };
    });
  }, []);

  const handleRemoveSectionExpansion = useCallback((index: number) => {
    setExpandedByIndex((prev) => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([keyStr, val]) => {
        const k = Number(keyStr);
        if (k < index) {
          next[k] = val;
        } else if (k > index) {
          next[k - 1] = val;
        }
      });
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      expandedByIndex,
      setSectionExpanded,
      toggleSectionExpanded,
      handleMoveSectionExpansion,
      handleRemoveSectionExpansion,
      setExpandedMap: setExpandedByIndex,
      isTitleEditing,
      setIsTitleEditing,
    }),
    [
      expandedByIndex,
      setSectionExpanded,
      toggleSectionExpanded,
      handleMoveSectionExpansion,
      handleRemoveSectionExpansion,
      isTitleEditing,
      setIsTitleEditing,
    ]
  );

  return <EditorUIStateContext.Provider value={value}>{children}</EditorUIStateContext.Provider>;
};

export const useEditorUIState = (): EditorUIStateContextValue | null => {
  return useContext(EditorUIStateContext);
};
