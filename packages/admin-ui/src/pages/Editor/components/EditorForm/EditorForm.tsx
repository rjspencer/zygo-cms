import React, { useEffect, useMemo, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { SectionTemplate } from '../../../../types/sectionTemplate';
import type { EntryFormValues, EntryType } from '../../types';
import { EMPTY_FORM_VALUES, toFormValues } from '../../utils/entryForm';
import { createEntryFormResolver, type ValidationContext } from '../../utils/validateEntryForm';
import { EditorLayout } from '../EditorLayout/EditorLayout';
import { EditorUIStateProvider } from '../../context/EditorUIStateContext';

interface EditorFormProps {
  id: string | undefined;
  isEditing: boolean;
  entryType: EntryType;
  /** Response of `/api/admin/editor/:id`; undefined until loaded or for new entries. */
  entryData: { entry?: Record<string, unknown>; pages?: Array<{ id?: number | string; slug?: string }> } | undefined;
  sectionTemplates: SectionTemplate[];
}

/** Owns the react-hook-form instance. Mount with a `key` of the entry id + type so state never leaks between entries. */
export const EditorForm: React.FC<EditorFormProps> = ({ id, isEditing, entryType, entryData, sectionTemplates }) => {
  const validationCtxRef = useRef<ValidationContext>({
    entryType,
    sectionTemplates,
    currentEntryId: isEditing ? id : undefined,
    existingEntries: entryData?.pages,
  });

  validationCtxRef.current = {
    entryType,
    sectionTemplates,
    currentEntryId: isEditing ? id : undefined,
    existingEntries: entryData?.pages,
  };

  const resolver = useMemo(() => createEntryFormResolver(() => validationCtxRef.current), []);

  const methods = useForm<EntryFormValues>({
    defaultValues: entryData?.entry ? toFormValues(entryData.entry) : EMPTY_FORM_VALUES,
    resolver,
  });
  const { reset } = methods;
  const hasLoaded = useRef(Boolean(entryData?.entry));

  // Seed the form once from the server record; later refetches must not clobber in-progress edits.
  useEffect(() => {
    if (entryData?.entry && !hasLoaded.current) {
      hasLoaded.current = true;
      reset(toFormValues(entryData.entry));
    }
  }, [entryData, reset]);

  return (
    <FormProvider {...methods}>
      <EditorUIStateProvider initialTitleEditing={!isEditing}>
        <EditorLayout id={id} isEditing={isEditing} entryType={entryType} sectionTemplates={sectionTemplates} />
      </EditorUIStateProvider>
    </FormProvider>
  );
};
