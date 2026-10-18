import { useFormContext } from 'react-hook-form';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { useTipTapWebMCP } from '../../../lib/webmcp/entryTools';
import type { SectionTemplate } from '../../../types/sectionTemplate';
import type { EntryFormValues, EntryType } from '../types';
import { useEditorUIState } from '../context/EditorUIStateContext';

interface UseEditorWebMCPOptions {
  editor: TipTapEditor | null;
  entryType: EntryType;
  sectionTemplates: SectionTemplate[];
  saveDraft: () => Promise<unknown>;
  publish: () => Promise<unknown>;
}

/** Registers the editor's WebMCP tools, backed by the react-hook-form state. */
export const useEditorWebMCP = ({ editor, entryType, sectionTemplates, saveDraft, publish }: UseEditorWebMCPOptions) => {
  const { setValue, getValues } = useFormContext<EntryFormValues>();
  const uiState = useEditorUIState();

  const setField =
    <K extends keyof EntryFormValues>(name: K) =>
    (value: EntryFormValues[K]) =>
      // RHF cannot resolve PathValue for a generic key; callers are still typed by K.
      setValue(name, value as never, { shouldDirty: true });

  const handleSetTitle = (newTitle: string) => {
    setValue('title', newTitle, { shouldDirty: true });
    uiState?.setIsTitleEditing(false);
  };

  useTipTapWebMCP({
    editor,
    entryType,
    sectionTemplates,
    getFormValues: () => getValues(),
    setContent: setField('content'),
    setTitle: handleSetTitle,
    setSlug: setField('slug'),
    setStatus: setField('status'),
    setDescription: setField('description'),
    setCategory: setField('category'),
    setTags: setField('tags'),
    setSections: setField('sections'),
    onExpandSection: (index: number) => {
      uiState?.setSectionExpanded(index, true);
    },
    setCoverImage: setField('coverImage'),
    setCanonicalUrl: setField('canonicalUrl'),
    setSchemaJson: setField('schemaJson'),
    setParentId: setField('parentId'),
    setSortOrder: setField('sortOrder'),
    onSaveDraft: saveDraft,
    onPublish: publish,
  });
};
