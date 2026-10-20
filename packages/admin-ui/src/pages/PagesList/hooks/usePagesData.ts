import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { PageItem } from '../types';

export interface UsePagesDataOptions {
  onDeleteSuccess?: () => void;
  onDeleteSettled?: () => void;
}

export function usePagesData(options?: UsePagesDataOptions) {
  const queryClient = useQueryClient();

  const { data: pages = [], isLoading, error } = useQuery<PageItem[]>({
    queryKey: ['entries', 'pages'],
    queryFn: async () => {
      const res = await apiFetch('/api/entries');
      if (!res.ok) throw new Error('Failed to fetch pages');
      const data = await res.json();
      return data
        .filter((e: any) => e.type === 'page')
        .map((e: any) => ({
          id: e.id,
          title: e.title,
          slug: e.path || `/${e.slug}`,
          status: e.status,
          updatedAt: (e.published_at || e.created_at || '').split(' ')[0] || (e.published_at || e.created_at || ''),
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
    pages,
    isLoading,
    error,
    deletePage: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}

