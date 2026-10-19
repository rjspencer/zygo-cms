import { useContext, useMemo } from 'react';
import { QueryClientContext, useQuery, QueryClient } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';
import { BUILT_IN_THEMES, MODERN_EDITORIAL_PRESET } from '../components/ThemeEditor/constants';
import {
  extractTokensFromSettings,
  generateThemeCss,
  cleanGoogleFontUrl,
  parseCustomThemes,
} from '../components/ThemeEditor/utils';
import type { ThemeTokens } from '../components/ThemeEditor/types';

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { enabled: false, retry: false } },
});

export interface UseActiveThemeReturn {
  tokens: ThemeTokens;
  themeCss: string;
  fontUrl: string;
  activeThemeName: string;
  isLoading: boolean;
}

export function useActiveTheme(): UseActiveThemeReturn {
  const clientContext = useContext(QueryClientContext);

  const { data: settingsData = {}, isLoading } = useQuery(
    {
      queryKey: ['settings'],
      queryFn: async () => {
        try {
          const res = await apiFetch('/api/settings');
          if (!res.ok) return {};
          return await res.json();
        } catch (_) {
          return {};
        }
      },
      enabled: Boolean(clientContext),
      staleTime: 60 * 1000,
    },
    clientContext || fallbackQueryClient
  );

  return useMemo(() => {
    const activeThemeName =
      (settingsData as Record<string, string>)?.theme_active_name || 'Modern Editorial';
    const customThemes = parseCustomThemes(
      (settingsData as Record<string, string>)?.theme_custom_themes
    );
    const fallbackPreset =
      BUILT_IN_THEMES[activeThemeName] ||
      customThemes.find((c) => c.name === activeThemeName)?.tokens ||
      MODERN_EDITORIAL_PRESET;

    const tokens = extractTokensFromSettings(
      settingsData as Record<string, string>,
      fallbackPreset
    );
    const themeCss = generateThemeCss(tokens);
    const fontUrl = cleanGoogleFontUrl(tokens.fontUrl);

    return {
      tokens,
      themeCss,
      fontUrl,
      activeThemeName,
      isLoading,
    };
  }, [settingsData, isLoading]);
}
