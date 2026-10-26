import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';

export function useLayoutData() {
  const { data: dashData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
    retry: false,
  });

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiFetch('/api/me');
      if (!res.ok) throw new Error('Failed to fetch me');
      return res.json();
    },
    retry: false,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiFetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
    retry: false,
  });

  const { data: submissionsStats } = useQuery({
    queryKey: ['submissions-stats'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/submissions/stats');
        if (!res.ok) {
          return {
            total_count: 0,
            unread_count: 0,
            read_count: 0,
            archived_count: 0,
          };
        }
        const data = await res.json();
        return {
          total_count: Number(data.total_count ?? data.total ?? 0),
          unread_count: Number(data.unread_count ?? data.unread ?? 0),
          read_count: Number(data.read_count ?? data.read ?? 0),
          archived_count: Number(data.archived_count ?? data.archived ?? 0),
        };
      } catch {
        return {
          total_count: 0,
          unread_count: 0,
          read_count: 0,
          archived_count: 0,
        };
      }
    },
    retry: false,
    refetchInterval: 30000,
  });

  const unreadSubmissionsCount = Number(submissionsStats?.unread_count ?? 0);

  const logoutUrl = dashData?.auth_url || '/cdn-cgi/access/logout';
  let userEmail = 'Admin User';
  if (meData?.email) {
    userEmail = meData.email;
  } else if (meData?.display_name) {
    userEmail = meData.display_name;
  } else if (dashData?.email) {
    userEmail = dashData.email;
  }

  const docsModeEnabled = settingsData?.docs_mode_enabled === 'true';

  return {
    logoutUrl,
    userEmail,
    docsModeEnabled,
    unreadSubmissionsCount,
  };
}
