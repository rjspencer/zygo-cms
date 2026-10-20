import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { SettingsApiResponse, AiCrawlApiResponse } from '../types';

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

  const aiCrawlQuery = useQuery<AiCrawlApiResponse>({
    queryKey: ['ai-crawl-settings'],
    queryFn: async () => {
      const res = await apiFetch('/api/cloudflare/ai-crawl');
      if (!res.ok) throw new Error('Failed to fetch AI crawl settings');
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

  const updateAiCrawlMutation = useMutation({
    mutationFn: async (aiCrawl: {
      ai_bots_protection?: string;
      ai_search?: string;
      ai_training?: string;
      ai_user?: string;
    }) => {
      const res = await apiFetch('/api/cloudflare/ai-crawl', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiCrawl),
      });
      if (!res.ok) {
        let msg = 'Failed to update Cloudflare AI Crawl settings';
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

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/cache/clear', { method: 'POST' });
      if (!res.ok) {
        let msg = 'Failed to clear cache';
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  return {
    clearCache: clearCacheMutation.mutate,
    isClearingCache: clearCacheMutation.isPending,
    clearCacheSuccess: clearCacheMutation.isSuccess,
    clearCacheError: clearCacheMutation.error?.message ?? null,
    data: query.data,
    isLoading: query.isLoading,
    aiCrawlData: aiCrawlQuery.data,
    isAiCrawlLoading: aiCrawlQuery.isLoading,
    isSaving: updateMutation.isPending || updateAiCrawlMutation.isPending,
    saveSettings: updateMutation.mutateAsync,
    saveAiCrawlSettings: updateAiCrawlMutation.mutateAsync,
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['ai-crawl-settings'] });
    },
  };
}
