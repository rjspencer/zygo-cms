import { useQuery } from '@tanstack/react-query';
import type { SectionTemplate } from '../../../types/sectionTemplate';
import { apiFetch } from '../../../utils/api';

/** Loads section templates and (when editing) the entry record for the editor. */
export const useEditorData = (id: string | undefined, isEditing: boolean) => {
  const { data: sectionTemplates = [] } = useQuery<SectionTemplate[]>({
    queryKey: ['sectionTemplates'],
    queryFn: async () => {
      const res = await apiFetch('/api/section-templates');
      if (!res.ok) throw new Error('Failed to fetch section templates');
      return res.json();
    },
  });

  const { data: entryData } = useQuery({
    queryKey: ['editorEntry', id],
    queryFn: async () => {
      const res = await apiFetch(`/api/admin/editor/${id}`);
      if (!res.ok) throw new Error('Failed to fetch entry');
      return res.json();
    },
    enabled: isEditing,
  });

  return { sectionTemplates, entryData };
};
