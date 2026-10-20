import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { DocItem, UseDocsDataReturn, UseDocsDataOptions } from '../types';

export function useDocsData(options?: UseDocsDataOptions): UseDocsDataReturn {
  const queryClient = useQueryClient();

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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/entries/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(await res.text());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      options?.onDeleteSuccess?.();
    },
    onError: (err) => {
      console.error('Delete failed', err);
    },
    onSettled: () => {
      options?.onDeleteSettled?.();
    },
  });

  return {
    docs,
    isLoading,
    deleteDoc: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
