import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type {
  AnalyticsApiResponse,
  AnalyticsMetrics,
  EdgeMetrics,
  EdgeRequestGroup,
  RumEventGroup,
  RumMetrics,
  UseAnalyticsDataReturn,
} from '../types';

export function useAnalyticsData(): UseAnalyticsDataReturn {
  const {
    data: rawData,
    isLoading,
    isError: isQueryError,
    error: queryError,
  } = useQuery<AnalyticsApiResponse>({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await apiFetch('/api/analytics');
      if (res.status === 403) {
        return { disabled: true };
      }
      if (!res.ok) {
        let msg = 'Failed to fetch analytics';
        try {
          const body = await res.json();
          msg = body.error || body.message || msg;
        } catch {
          // ignore json parse error
        }
        const err = new Error(msg);
        (err as any).status = res.status;
        throw err;
      }
      return res.json();
    },
  });

  const isAnalyticsDisabled = Boolean(
    rawData?.disabled ||
      (queryError as any)?.status === 403 ||
      queryError?.message?.includes('403')
  );

  const isMissingCredentials = Boolean(
    !isAnalyticsDisabled &&
      (rawData?.missing_credentials || rawData?.configured === false)
  );

  const rawGraphQLError =
    rawData?.error ||
    (rawData?.errors && rawData.errors.length > 0
      ? rawData.errors.map((e) => e.message).join(', ')
      : null);

  const isPayloadError = Boolean(rawGraphQLError);
  const isError = !isAnalyticsDisabled && (isQueryError || isPayloadError);
  const errorMessage = !isAnalyticsDisabled
    ? (queryError?.message || rawGraphQLError || null)
    : null;

  const rumGroups: RumEventGroup[] =
    rawData?.rum?.groups ||
    rawData?.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups ||
    rawData?.data?.viewer?.zones?.[0]?.rumPageloadEventsAdaptiveGroups ||
    [];

  const edgeGroups: EdgeRequestGroup[] =
    rawData?.edge?.groups ||
    rawData?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ||
    [];

  const isRumConfigured = rawData?.rum_configured ?? (rumGroups.length > 0);
  const isEdgeConfigured = rawData?.edge_configured ?? (edgeGroups.length > 0);

  const rumTotalViews = rumGroups.reduce((acc, item) => acc + (item.count || 0), 0);
  const rumTopPath =
    rumGroups.length > 0 ? (rumGroups[0].dimensions?.requestPath || 'N/A') : 'N/A';
  const rumTopCountry =
    rumGroups.length > 0
      ? rumGroups[0].dimensions?.countryName ||
        rumGroups[0].dimensions?.clientCountryName ||
        'N/A'
      : 'N/A';
  const rumUniquePaths = rumGroups.length;

  const rumMetrics: RumMetrics = {
    totalViews: rumTotalViews,
    topPath: rumTopPath,
    topCountry: rumTopCountry,
    uniquePaths: rumUniquePaths,
    groups: rumGroups,
  };

  const edgeTotalRequests = edgeGroups.reduce((acc, item) => acc + (item.count || 0), 0);
  const edgeTotalBytes = edgeGroups.reduce(
    (acc, item) => acc + (item.sum?.edgeResponseBytes || 0),
    0
  );
  const edgeTopPath =
    edgeGroups.length > 0 ? (edgeGroups[0].dimensions?.clientRequestPath || 'N/A') : 'N/A';
  const edgeTopCountry =
    edgeGroups.length > 0 ? (edgeGroups[0].dimensions?.clientCountryName || 'N/A') : 'N/A';
  const edgeUniquePaths = edgeGroups.length;

  const edgeMetrics: EdgeMetrics = {
    totalRequests: edgeTotalRequests,
    totalBytes: edgeTotalBytes,
    topPath: edgeTopPath,
    topCountry: edgeTopCountry,
    uniquePaths: edgeUniquePaths,
    groups: edgeGroups,
  };

  const hasRum = rumGroups.length > 0;
  const metrics: AnalyticsMetrics = {
    totalViews: hasRum ? rumTotalViews : edgeTotalRequests,
    topPath: hasRum ? rumTopPath : edgeTopPath,
    topCountry: hasRum ? rumTopCountry : edgeTopCountry,
    uniquePaths: hasRum ? rumUniquePaths : edgeUniquePaths,
    rum: rumMetrics,
    edge: edgeMetrics,
  };

  return {
    metrics,
    isLoading,
    isError,
    errorMessage,
    isAnalyticsDisabled,
    isMissingCredentials,
    isRumConfigured,
    isEdgeConfigured,
  };
}
