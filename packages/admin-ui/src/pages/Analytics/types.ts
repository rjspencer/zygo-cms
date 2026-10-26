export interface RumEventDimension {
  requestPath?: string;
  countryName?: string;
  clientCountryName?: string;
}

export interface RumEventGroup {
  count: number;
  dimensions: RumEventDimension;
}

export interface EdgeRequestDimension {
  clientRequestPath?: string;
  clientCountryName?: string;
}

export interface EdgeRequestSum {
  edgeResponseBytes?: number;
}

export interface EdgeRequestGroup {
  count: number;
  sum?: EdgeRequestSum;
  dimensions: EdgeRequestDimension;
}

export interface AnalyticsApiResponse {
  disabled?: boolean;
  configured?: boolean;
  missing_credentials?: boolean;
  rum_configured?: boolean;
  edge_configured?: boolean;
  site_tag_configured?: boolean;
  message?: string;
  error?: string;
  errors?: Array<{ message: string }>;
  rum?: {
    groups?: RumEventGroup[];
  };
  edge?: {
    groups?: EdgeRequestGroup[];
  };
  data?: {
    viewer?: {
      accounts?: Array<{
        rumPageloadEventsAdaptiveGroups?: RumEventGroup[];
      }>;
      zones?: Array<{
        httpRequestsAdaptiveGroups?: EdgeRequestGroup[];
        rumPageloadEventsAdaptiveGroups?: RumEventGroup[];
      }>;
    };
  };
}

export interface RumMetrics {
  totalViews: number;
  topPath: string;
  topCountry: string;
  uniquePaths: number;
  groups: RumEventGroup[];
}

export interface EdgeMetrics {
  totalRequests: number;
  totalBytes: number;
  topPath: string;
  topCountry: string;
  uniquePaths: number;
  groups: EdgeRequestGroup[];
}

export interface AnalyticsMetrics {
  totalViews: number;
  topPath: string;
  topCountry: string;
  uniquePaths: number;
  rum: RumMetrics;
  edge: EdgeMetrics;
}

export interface UseAnalyticsDataReturn {
  metrics: AnalyticsMetrics;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  isAnalyticsDisabled: boolean;
  isMissingCredentials: boolean;
  isRumConfigured: boolean;
  isEdgeConfigured: boolean;
}
