import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useUnsavedChangesBlocker } from '../../../hooks/useUnsavedChangesBlocker';
import type { SettingsApiResponse, SettingsFormValues } from '../types';

export const DEFAULT_SETTINGS_VALUES: SettingsFormValues = {
  siteTitle: '',
  canonicalOrigin: '',
  description: '',
  analyticsEnabled: false,
  docsModeEnabled: false,
  docsPath: '/docs',
};

export function useSettingsForm(
  settingsData: SettingsApiResponse | undefined,
  saveSettings: (settings: Record<string, string>) => Promise<unknown>,
  invalidate: () => void
) {
  const methods = useForm<SettingsFormValues>({
    defaultValues: DEFAULT_SETTINGS_VALUES,
  });

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (settingsData) {
      methods.reset({
        siteTitle: settingsData.site_title || '',
        canonicalOrigin: settingsData.canonical_origin || '',
        description: settingsData.description || '',
        analyticsEnabled: settingsData.analytics_enabled === 'true',
        docsModeEnabled: settingsData.docs_mode_enabled === 'true',
        docsPath: settingsData.docs_path || '/docs',
      });
    }
  }, [settingsData, methods]);

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
      });

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
