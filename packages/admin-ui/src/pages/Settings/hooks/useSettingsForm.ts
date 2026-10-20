import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useUnsavedChangesBlocker } from '../../../hooks/useUnsavedChangesBlocker';
import type { SettingsApiResponse, AiCrawlApiResponse, SettingsFormValues } from '../types';

export const DEFAULT_SETTINGS_VALUES: SettingsFormValues = {
  siteTitle: '',
  canonicalOrigin: '',
  description: '',
  analyticsEnabled: false,
  docsModeEnabled: false,
  docsPath: '/docs',
  siteLogo: '',
  siteLogoDark: '',
  siteFavicon: '',
  defaultOgImage: '',
  footerText: '',
  aiBotsProtection: 'disabled',
  aiSearch: 'disabled',
  aiTraining: 'disabled',
  aiUser: 'disabled',
};

export function useSettingsForm(
  settingsData: SettingsApiResponse | undefined,
  saveSettings: (settings: Record<string, string>) => Promise<unknown>,
  invalidate: () => void,
  aiCrawlData?: AiCrawlApiResponse | undefined,
  saveAiCrawlSettings?: (aiCrawl: {
    ai_bots_protection?: string;
    ai_search?: string;
    ai_training?: string;
    ai_user?: string;
  }) => Promise<unknown>
) {
  const methods = useForm<SettingsFormValues>({
    defaultValues: DEFAULT_SETTINGS_VALUES,
  });

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (settingsData || aiCrawlData) {
      methods.reset({
        siteTitle: settingsData?.site_title || '',
        canonicalOrigin: settingsData?.canonical_origin || '',
        description: settingsData?.description || '',
        analyticsEnabled: settingsData?.analytics_enabled === 'true',
        docsModeEnabled: settingsData?.docs_mode_enabled === 'true',
        docsPath: settingsData?.docs_path || '/docs',
        siteLogo: (settingsData?.site_logo as string) || '',
        siteLogoDark: (settingsData?.site_logo_dark as string) || '',
        siteFavicon: (settingsData?.site_favicon as string) || '',
        defaultOgImage: (settingsData?.default_og_image as string) || '',
        footerText: (settingsData?.footer_text as string) || '',
        aiBotsProtection: aiCrawlData?.ai_bots_protection || 'disabled',
        aiSearch: aiCrawlData?.ai_search || 'disabled',
        aiTraining: aiCrawlData?.ai_training || 'disabled',
        aiUser: aiCrawlData?.ai_user || 'disabled',
      });
    }
  }, [settingsData, aiCrawlData, methods]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const { isDirty } = methods.formState;
  const { blocker } = useUnsavedChangesBlocker(isDirty);

  const handleSave = methods.handleSubmit(async (values) => {
    setError(null);
    try {
      await saveSettings({
        site_title: values.siteTitle,
        canonical_origin: values.canonicalOrigin,
        description: values.description,
        analytics_enabled: values.analyticsEnabled ? 'true' : 'false',
        docs_mode_enabled: values.docsModeEnabled ? 'true' : 'false',
        docs_path: values.docsPath,
        site_logo: values.siteLogo,
        site_logo_dark: values.siteLogoDark,
        site_favicon: values.siteFavicon,
        default_og_image: values.defaultOgImage,
        footer_text: values.footerText,
      });

      if (aiCrawlData?.configured && saveAiCrawlSettings) {
        await saveAiCrawlSettings({
          ai_bots_protection: values.aiBotsProtection,
          ai_search: values.aiSearch,
          ai_training: values.aiTraining,
          ai_user: values.aiUser,
        });
      }

      invalidate();
      methods.reset(values);

      setSaved(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save settings');
    }
  });

  return {
    methods,
    blocker,
    isDirty,
    saved,
    error,
    handleSave,
  };
}
