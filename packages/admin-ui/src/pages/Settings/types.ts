export interface SettingsProps {}

export interface SettingsFormValues {
  siteTitle: string;
  canonicalOrigin: string;
  description: string;
  analyticsEnabled: boolean;
  docsModeEnabled: boolean;
  docsPath: string;
  siteLogo: string;
  siteFavicon: string;
  defaultOgImage: string;
  footerText: string;
}

export interface SettingsApiResponse {
  site_title?: string;
  canonical_origin?: string;
  description?: string;
  analytics_enabled?: string;
  docs_mode_enabled?: string;
  docs_path?: string;
  site_logo?: string;
  site_favicon?: string;
  default_og_image?: string;
  footer_text?: string;
  [key: string]: unknown;
}
