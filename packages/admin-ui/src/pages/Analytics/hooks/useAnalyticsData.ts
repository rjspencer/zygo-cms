import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { AnalyticsApiResponse, RumEventGroup, UseAnalyticsDataReturn } from '../types';

export function useAnalyticsData(): UseAnalyticsDataReturn {
  const { data: rawData, isLoading, isError, error } = useQuery<AnalyticsApiResponse>({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await apiFetch('/api/analytics');
      if (res.status === 403) {
        return { disabled: true };
      }
      if (!res.ok) {
        const err = new Error('Failed to fetch analytics');
        (err as any).status = res.status;
        throw err;
      }
      return res.json();
    },
  });

  const isAnalyticsDisabled = Boolean(
    rawData?.disabled || (error as any)?.status === 403 || error?.message?.includes('403')
  );

  const events: RumEventGroup[] =
    rawData?.data?.viewer?.zones?.[0]?.rumPageloadEventsAdaptiveGroups || [];

  const totalViews = events.reduce((acc: number, item: RumEventGroup) => acc + item.count, 0);
  const topPath = events.length > 0 ? (events[0].dimensions.requestPath || 'N/A') : 'N/A';
  const topCountry = events.length > 0 ? (events[0].dimensions.clientCountryName || 'N/A') : 'N/A';
  const uniquePaths = events.length;

  return {
    metrics: {
      totalViews,
      topPath,
      topCountry,
      uniquePaths,
    },
    isLoading,
    isError,
    isAnalyticsDisabled,
  };
}
