import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';

export function useThemeSettingsApi() {
  const queryClient = useQueryClient();

  const { data: settingsData = {}, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiFetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        let msg = 'Failed to save theme settings';
        try {
          const errData = await res.json();
          if (errData?.error || errData?.message) msg = errData.error || errData.message;
        } catch (_) {}
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  return {
    settingsData,
    isLoading,
    isSaving: updateSettingsMutation.isPending,
    saveSettings: updateSettingsMutation.mutateAsync,
  };
}
