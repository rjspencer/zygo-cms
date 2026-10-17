import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { EditorForm } from './components/EditorForm/EditorForm';
import { EditorStatusView } from './components/EditorStatusView';
import { useEditorData } from './hooks/useEditorData';
import { useEntryType } from './hooks/useEntryType';

export const Editor: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id && id !== 'new');

  const { sectionTemplates, entryData, isEntryLoading, isEntryError, entryError, refetchEntry } =
    useEditorData(id, isEditing);
  const entryType = useEntryType(entryData?.entry?.type);

  const prevStateRef = useRef({ id, entryType, sessionCounter: 0 });

  if (prevStateRef.current.entryType !== entryType) {
    prevStateRef.current.sessionCounter += 1;
  } else if (prevStateRef.current.id !== id) {
    const isFirstSave =
      (!prevStateRef.current.id || prevStateRef.current.id === 'new') &&
      Boolean(id && id !== 'new') &&
      Boolean(entryData?.entry);
    if (!isFirstSave) {
      prevStateRef.current.sessionCounter += 1;
    }
  }
  prevStateRef.current.id = id;
  prevStateRef.current.entryType = entryType;

  if (isEditing && isEntryLoading) {
    return <EditorStatusView status="loading" />;
  }

  if (isEditing && isEntryError) {
    return (
      <EditorStatusView
        status="error"
        errorMessage={entryError?.message}
        onRetry={() => void refetchEntry()}
      />
    );
  }

  return (
    <EditorForm
      key={`editor-session-${prevStateRef.current.sessionCounter}-${entryType}`}
      id={id}
      isEditing={isEditing}
      entryType={entryType}
      entryData={entryData}
      sectionTemplates={sectionTemplates}
    />
  );
};

export default Editor;
