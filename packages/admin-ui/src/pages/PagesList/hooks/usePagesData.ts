import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { PageItem } from '../types';

export function usePagesData() {
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

  return {
    pages,
    isLoading,
    error,
  };
}
