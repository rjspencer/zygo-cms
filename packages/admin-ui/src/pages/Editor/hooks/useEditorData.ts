import { useQuery } from '@tanstack/react-query';
import type { SectionTemplate } from '../../../types/sectionTemplate';
import { apiFetch } from '../../../utils/api';

export interface UseEditorDataResult {
  sectionTemplates: SectionTemplate[];
  entryData: { entry?: Record<string, any>; pages?: Array<{ id?: number | string; slug?: string }> } | undefined;
  isEntryLoading: boolean;
  isEntryError: boolean;
  entryError: Error | null;
  refetchEntry: () => void;
}

/** Loads section templates and (when editing) the entry record for the editor. */
export const useEditorData = (id: string | undefined, isEditing: boolean): UseEditorDataResult => {
  const { data: sectionTemplates = [] } = useQuery<SectionTemplate[]>({
    queryKey: ['sectionTemplates'],
    queryFn: async () => {
      const res = await apiFetch('/api/section-templates');
      if (!res.ok) throw new Error('Failed to fetch section templates');
      return res.json();
    },
  });

  const {
    data: entryData,
    isLoading: isEntryLoading,
    isError: isEntryError,
    error: entryError,
    refetch: refetchEntry,
  } = useQuery<{ entry?: Record<string, any>; pages?: Array<{ id?: number | string; slug?: string }> }>({
    queryKey: ['editorEntry', id],
    queryFn: async () => {
      const res = await apiFetch(`/api/admin/editor/${id}`);
      if (!res.ok) throw new Error('Failed to fetch entry');
      return res.json();
    },
    enabled: isEditing,
  });

  return {
    sectionTemplates,
    entryData,
    isEntryLoading: isEditing && isEntryLoading,
    isEntryError: isEditing && isEntryError,
    entryError: (entryError as Error | null) ?? null,
    refetchEntry: () => void refetchEntry(),
  };
};
