export interface SettingsProps {}

export interface SettingsFormValues {
  siteTitle: string;
  canonicalOrigin: string;
  description: string;
  analyticsEnabled: boolean;
  docsModeEnabled: boolean;
  docsPath: string;
}

export interface SettingsApiResponse {
  site_title?: string;
  canonical_origin?: string;
  description?: string;
  analytics_enabled?: string;
  docs_mode_enabled?: string;
  docs_path?: string;
  [key: string]: unknown;
}
