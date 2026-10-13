import { useFormContext, useWatch } from 'react-hook-form';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { useTipTapWebMCP } from '../../../lib/webmcp/entryTools';
import type { SectionTemplate } from '../../../types/sectionTemplate';
import type { EntryFormValues, EntryType } from '../types';

interface UseEditorWebMCPOptions {
  editor: TipTapEditor | null;
  entryType: EntryType;
  sectionTemplates: SectionTemplate[];
  saveDraft: () => Promise<unknown>;
  publish: () => Promise<unknown>;
}

/** Registers the editor's WebMCP tools, backed by the react-hook-form state. */
export const useEditorWebMCP = ({ editor, entryType, sectionTemplates, saveDraft, publish }: UseEditorWebMCPOptions) => {
  const { control, setValue } = useFormContext<EntryFormValues>();
  const values = useWatch({ control }) as EntryFormValues;

  const setField =
    <K extends keyof EntryFormValues>(name: K) =>
    (value: EntryFormValues[K]) =>
      // RHF cannot resolve PathValue for a generic key; callers are still typed by K.
      setValue(name, value as never, { shouldDirty: true });

  useTipTapWebMCP({
    editor,
    entryType,
    sectionTemplates,
    content: values.content,
    setContent: setField('content'),
    title: values.title,
    setTitle: setField('title'),
    slug: values.slug,
    setSlug: setField('slug'),
    status: values.status,
    setStatus: setField('status'),
    description: values.description,
    setDescription: setField('description'),
    category: values.category,
    setCategory: setField('category'),
    tags: values.tags,
    setTags: setField('tags'),
    sections: values.sections,
    setSections: setField('sections'),
    coverImage: values.coverImage,
    setCoverImage: setField('coverImage'),
    canonicalUrl: values.canonicalUrl,
    setCanonicalUrl: setField('canonicalUrl'),
    schemaJson: values.schemaJson,
    setSchemaJson: setField('schemaJson'),
    parentId: values.parentId,
    setParentId: setField('parentId'),
    sortOrder: values.sortOrder,
    setSortOrder: setField('sortOrder'),
    onSaveDraft: saveDraft,
    onPublish: publish,
  });
};
