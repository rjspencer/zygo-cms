import React from 'react';
import { useParams } from 'react-router-dom';
import { EditorForm } from './components/EditorForm/EditorForm';
import { useEditorData } from './hooks/useEditorData';
import { useEntryType } from './hooks/useEntryType';

export const Editor: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id && id !== 'new');

  const { sectionTemplates, entryData } = useEditorData(id, isEditing);
  const entryType = useEntryType(entryData?.entry?.type);

  return (
    <EditorForm
      key={`${id ?? 'new'}-${entryType}`}
      id={id}
      isEditing={isEditing}
      entryType={entryType}
      entryData={entryData}
      sectionTemplates={sectionTemplates}
    />
  );
};

export default Editor;
