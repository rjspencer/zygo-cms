import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { PostItem } from '../types';

export interface UsePostsDataOptions {
  onDeleteSuccess?: () => void;
  onDeleteSettled?: () => void;
}

export function usePostsData(options?: UsePostsDataOptions) {
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery<PostItem[]>({
    queryKey: ['entries', 'posts'],
    queryFn: async () => {
      const res = await apiFetch('/api/entries');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      return data
        .filter((e: any) => e.type === 'post')
        .map((e: any) => ({
          id: e.id,
          title: e.title,
          slug: e.slug,
          status: e.status,
          date:
            (e.published_at || e.created_at || '').split(/[ T]/)[0] ||
            (e.published_at || e.created_at || ''),
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
    posts,
    isLoading,
    deletePost: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
