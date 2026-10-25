import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../../../utils/api';
import type { Theme, ThemesApiReturn } from '../types';

export function useThemesApi(): ThemesApiReturn {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThemesAndSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [themesRes, settingsRes] = await Promise.all([
        apiFetch('/api/themes'),
        apiFetch('/api/settings'),
      ]);

      if (!themesRes.ok) {
        throw new Error(`Failed to fetch themes: ${themesRes.statusText}`);
      }
      const themesData = await themesRes.json();
      setThemes(themesData);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading themes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThemesAndSettings();
  }, [fetchThemesAndSettings]);

  const primaryThemeId =
    settings.theme_primary_id ||
    themes.find((t) => t.name === settings.theme_active_name)?.id ||
    (themes.length > 0 ? themes[0].id : 'modern-editorial');

  const darkThemeId = settings.theme_dark_id?.trim() || null;

  const createTheme = async (name: string, description?: string, basePresetId?: string) => {
    const res = await apiFetch('/api/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: description || undefined,
        base_theme_id: basePresetId || 'modern-editorial',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create theme');
    }
    const created: Theme = await res.json();
    await fetchThemesAndSettings();
    return created;
  };

  const activateTheme = async (id: string | null, role: 'primary' | 'dark') => {
    const res = await apiFetch('/api/themes/activate', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to activate theme');
    }
    await fetchThemesAndSettings();
    return true;
  };

  const renameTheme = async (id: string, name: string) => {
    const res = await apiFetch(`/api/themes/${id}/rename`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to rename theme');
    }
    await fetchThemesAndSettings();
    return true;
  };

  const duplicateTheme = async (id: string) => {
    const res = await apiFetch(`/api/themes/${id}/duplicate`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to duplicate theme');
    }
    const duplicated: Theme = await res.json();
    await fetchThemesAndSettings();
    return duplicated;
  };

  const deleteTheme = async (id: string) => {
    const res = await apiFetch(`/api/themes/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete theme');
    }
    await fetchThemesAndSettings();
    return true;
  };

  return {
    themes,
    settings,
    isLoading,
    error,
    primaryThemeId,
    darkThemeId,
    refresh: fetchThemesAndSettings,
    createTheme,
    activateTheme,
    renameTheme,
    duplicateTheme,
    deleteTheme,
  };
}
