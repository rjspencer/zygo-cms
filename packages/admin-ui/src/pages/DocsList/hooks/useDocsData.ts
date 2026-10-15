import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { DocItem, UseDocsDataReturn } from '../types';

export function useDocsData(): UseDocsDataReturn {
  const { data: docs = [], isLoading } = useQuery<DocItem[]>({
    queryKey: ['entries', 'docs'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/docs');
      if (!res.ok) throw new Error('Failed to fetch docs');
      const data = await res.json();
      return (data.entries || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        path: e.path || `/${e.slug}`,
        status: e.status,
        updatedAt: (e.published_at || e.created_at || '').split(' ')[0] || (e.published_at || e.created_at || ''),
        parent_id: e.parent_id,
        sort_order: e.sort_order,
      }));
    },
  });

  return {
    docs,
    isLoading,
  };
}
