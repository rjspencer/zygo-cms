import React, { useEffect, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { SectionTemplate } from '../../../../types/sectionTemplate';
import type { EntryFormValues, EntryType } from '../../types';
import { EMPTY_FORM_VALUES, toFormValues } from '../../utils/entryForm';
import { EditorLayout } from '../EditorLayout/EditorLayout';

interface EditorFormProps {
  id: string | undefined;
  isEditing: boolean;
  entryType: EntryType;
  /** Response of `/api/admin/editor/:id`; undefined until loaded or for new entries. */
  entryData: { entry?: Record<string, unknown> } | undefined;
  sectionTemplates: SectionTemplate[];
}

/** Owns the react-hook-form instance. Mount with a `key` of the entry id + type so state never leaks between entries. */
export const EditorForm: React.FC<EditorFormProps> = ({ id, isEditing, entryType, entryData, sectionTemplates }) => {
  const methods = useForm<EntryFormValues>({ defaultValues: EMPTY_FORM_VALUES });
  const { reset } = methods;
  const hasLoaded = useRef(false);

  // Seed the form once from the server record; later refetches must not clobber in-progress edits.
  useEffect(() => {
    if (entryData?.entry && !hasLoaded.current) {
      hasLoaded.current = true;
      reset(toFormValues(entryData.entry));
    }
  }, [entryData, reset]);

  return (
    <FormProvider {...methods}>
      <EditorLayout id={id} isEditing={isEditing} entryType={entryType} sectionTemplates={sectionTemplates} />
    </FormProvider>
  );
};
