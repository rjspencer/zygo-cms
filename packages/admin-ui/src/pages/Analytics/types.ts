export interface RumEventDimension {
  requestPath?: string;
  clientCountryName?: string;
}

export interface RumEventGroup {
  count: number;
  dimensions: RumEventDimension;
}

export interface AnalyticsApiResponse {
  disabled?: boolean;
  data?: {
    viewer?: {
      zones?: Array<{
        rumPageloadEventsAdaptiveGroups?: RumEventGroup[];
      }>;
    };
  };
}

export interface AnalyticsMetrics {
  totalViews: number;
  topPath: string;
  topCountry: string;
  uniquePaths: number;
}

export interface UseAnalyticsDataReturn {
  metrics: AnalyticsMetrics;
  isLoading: boolean;
  isError: boolean;
  isAnalyticsDisabled: boolean;
}
