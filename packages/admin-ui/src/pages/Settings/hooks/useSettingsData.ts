import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { SettingsApiResponse } from '../types';

export function useSettingsData() {
  const queryClient = useQueryClient();

  const query = useQuery<SettingsApiResponse>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiFetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        let msg = 'Failed to save settings';
        try {
          const errData = await res.json();
          if (errData?.error || errData?.message) {
            msg = errData.error || errData.message;
          }
        } catch (_) {}
        throw new Error(msg);
      }
      return res.json();
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isSaving: updateMutation.isPending,
    saveSettings: updateMutation.mutateAsync,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  };
}
