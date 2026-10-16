import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';

export interface UseRoleGuardResult {
  role: string;
  isLoading: boolean;
}

export const useRoleGuard = (): UseRoleGuardResult => {
  const { data: meData, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiFetch('/api/me');
      if (!res.ok) throw new Error('Failed to fetch me');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const role = meData?.role?.toLowerCase() || 'author';

  return { role, isLoading };
};
