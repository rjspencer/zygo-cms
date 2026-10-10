import React, { useState, useEffect, useRef } from 'react';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Card,
  TextField,
  Separator,
  Badge,
  Callout,
  Grid,
  Select,
  Dialog,
  AlertDialog,
} from '@radix-ui/themes';
import {
  CheckIcon,
  InfoCircledIcon,
  ExternalLinkIcon,
  CopyIcon,
  ColorWheelIcon,
  FontFamilyIcon,
  HeadingIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  BorderBottomIcon,
} from '@radix-ui/react-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';
import { useUnsavedChangesBlocker } from '../hooks/useUnsavedChangesBlocker';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import { useThemeEditorWebMCP } from '../lib/webmcp/themeAndMediaTools';

export interface ThemeTokens {
  fontUrl: string;
  fontHeadline: string;
  fontBody: string;
  colorBg: string;
  colorText: string;
  colorTextMuted: string;
  colorAccent: string;
  colorSurface: string;
  colorBorder: string;
  maxWidth: string;
  fontSizeBase: string;
  lineHeightBody: string;
  // Header styles
  headerLayout: 'split' | 'centered' | 'stacked';
  headerBorderStyle: 'double' | 'solid' | 'none';
  headerTitleSize: string;
  headerNavTransform: 'uppercase' | 'none';
  headerPadding: string;
  headerTagline: string;
}

export interface CustomThemeEntry {
  name: string;
  baseTheme: string;
  tokens: ThemeTokens;
}

export const MODERN_EDITORIAL_PRESET: ThemeTokens = {
  fontUrl:
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&display=swap',
  fontHeadline: "'Newsreader', Georgia, serif",
  fontBody: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  colorBg: '#faf8f5',
  colorText: '#1c1917',
  colorTextMuted: '#78716c',
  colorAccent: '#991b1b',
  colorSurface: '#ffffff',
  colorBorder: '#e7e5e4',
  maxWidth: '740px',
  fontSizeBase: '18px',
  lineHeightBody: '1.75',
  headerLayout: 'centered',
  headerBorderStyle: 'double',
  headerTitleSize: '2rem',
  headerNavTransform: 'uppercase',
  headerPadding: '1.75rem 0 1.25rem 0',
  headerTagline: 'An Editorial Review & Journal',
};

export const BENTO_BRUTALISM_PRESET: ThemeTokens = {
  fontUrl:
    'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap',
  fontHeadline: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  fontBody: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  colorBg: '#f6f5f0',
  colorText: '#0f172a',
  colorTextMuted: '#334155',
  colorAccent: '#007799',
  colorSurface: '#ffffff',
  colorBorder: '#0f172a',
  maxWidth: '960px',
  fontSizeBase: '17px',
  lineHeightBody: '1.7',
  headerLayout: 'split',
  headerBorderStyle: 'solid',
  headerTitleSize: '1.5rem',
  headerNavTransform: 'uppercase',
  headerPadding: '1.25rem 0',
  headerTagline: 'Specs, Dispatches & Agentic Systems',
};

export const BUILT_IN_THEMES: Record<string, ThemeTokens> = {
  'Modern Editorial': MODERN_EDITORIAL_PRESET,
  'Bento-Brutalism': BENTO_BRUTALISM_PRESET,
};

export const CMYK_INK_SWATCHES = [
  { name: 'Process Cyan (C)', hex: '#007799' },
  { name: 'Process Magenta (M)', hex: '#be185d' },
  { name: 'Process Yellow (Y)', hex: '#b45309' },
  { name: 'Registration Black (K)', hex: '#0f172a' },
];

export const FONT_PRESETS: Array<{
  name: string;
  headlineFont: string;
  bodyFont: string;
  url: string;
  description: string;
}> = [
    {
      name: 'Newsreader & Inter (Modern Editorial)',
      headlineFont: "'Newsreader', Georgia, serif",
      bodyFont: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&display=swap',
      description: 'Prestigious literary serif paired with a crisp, hyper-readable modern sans.',
    },
    {
      name: 'Space Grotesk & IBM Plex Mono (Bento-Brutalism)',
      headlineFont: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
      bodyFont: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap',
      description:
        'Geometric display grotesk with technical monospace accents and print-shop clarity.',
    },
    {
      name: 'Playfair Display & Source Sans (Vogue / Fashion)',
      headlineFont: "'Playfair Display', Georgia, serif",
      bodyFont: "'Source Sans 3', -apple-system, sans-serif",
      url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..700&family=Source+Sans+3:wght@400;500;600&display=swap',
      description: 'High-contrast transitional serif headlines for an elegant editorial tone.',
    },
    {
      name: 'Fraunces & Inter (Warm Contemporary)',
      headlineFont: "'Fraunces', Georgia, serif",
      bodyFont: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      url: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600&display=swap',
      description: 'Characterful, warm old-style serif with expressive personality.',
    },
    {
      name: 'Lora & Merriweather Sans (Classic Journal)',
      headlineFont: "'Lora', Georgia, serif",
      bodyFont: "'Merriweather Sans', -apple-system, sans-serif",
      url: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Merriweather+Sans:wght@400;500;600&display=swap',
      description: 'Contemporary serif with roots in calligraphy, ideal for long essays.',
    },
    {
      name: 'Space Mono & System Sans (Technical Original)',
      headlineFont: "'Space Mono', monospace",
      bodyFont: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      url: 'https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap',
      description: 'Original Zygo developer aesthetic with monospace headlines.',
    },
  ];

// Helper to extract clean URL if user pastes a full <link> tag
export function cleanGoogleFontUrl(input: string): string {
  const trimmed = input.trim();
  const hrefMatch = trimmed.match(/href=["']([^"']+)["']/i);
  if (hrefMatch && hrefMatch[1]) {
    return hrefMatch[1];
  }
  return trimmed;
}

export function areTokensEqual(a: ThemeTokens, b: ThemeTokens): boolean {
  return (
    a.fontUrl === b.fontUrl &&
    a.fontHeadline === b.fontHeadline &&
    a.fontBody === b.fontBody &&
    a.colorBg === b.colorBg &&
    a.colorText === b.colorText &&
    a.colorTextMuted === b.colorTextMuted &&
    a.colorAccent === b.colorAccent &&
    a.colorSurface === b.colorSurface &&
    a.colorBorder === b.colorBorder &&
    a.maxWidth === b.maxWidth &&
    a.fontSizeBase === b.fontSizeBase &&
    a.lineHeightBody === b.lineHeightBody &&
    a.headerLayout === b.headerLayout &&
    a.headerBorderStyle === b.headerBorderStyle &&
    a.headerTitleSize === b.headerTitleSize &&
    a.headerNavTransform === b.headerNavTransform &&
    a.headerPadding === b.headerPadding &&
    a.headerTagline === b.headerTagline
  );
}

export function tokensToSettingsPayload(tokens: ThemeTokens): Record<string, string> {
  return {
    theme_font_url: tokens.fontUrl,
    theme_font_headline: tokens.fontHeadline,
    theme_font_body: tokens.fontBody,
    theme_color_bg: tokens.colorBg,
    theme_color_text: tokens.colorText,
    theme_color_text_muted: tokens.colorTextMuted,
    theme_color_accent: tokens.colorAccent,
    theme_color_surface: tokens.colorSurface,
    theme_color_border: tokens.colorBorder,
    theme_max_width: tokens.maxWidth,
    theme_font_size_base: tokens.fontSizeBase,
    theme_line_height: tokens.lineHeightBody,
    theme_header_layout: tokens.headerLayout,
    theme_header_border_style: tokens.headerBorderStyle,
    theme_header_title_size: tokens.headerTitleSize,
    theme_header_nav_transform: tokens.headerNavTransform,
    theme_header_padding: tokens.headerPadding,
    theme_header_tagline: tokens.headerTagline,
  };
}

export function extractTokensFromSettings(
  settingsData: Record<string, string>,
  fallback: ThemeTokens = MODERN_EDITORIAL_PRESET
): ThemeTokens {
  return {
    fontUrl: settingsData.theme_font_url || fallback.fontUrl,
    fontHeadline: settingsData.theme_font_headline || fallback.fontHeadline,
    fontBody: settingsData.theme_font_body || fallback.fontBody,
    colorBg: settingsData.theme_color_bg || fallback.colorBg,
    colorText: settingsData.theme_color_text || fallback.colorText,
    colorTextMuted: settingsData.theme_color_text_muted || fallback.colorTextMuted,
    colorAccent: settingsData.theme_color_accent || fallback.colorAccent,
    colorSurface: settingsData.theme_color_surface || fallback.colorSurface,
    colorBorder: settingsData.theme_color_border || fallback.colorBorder,
    maxWidth: settingsData.theme_max_width || fallback.maxWidth,
    fontSizeBase: settingsData.theme_font_size_base || fallback.fontSizeBase,
    lineHeightBody: settingsData.theme_line_height || fallback.lineHeightBody,
    headerLayout:
      (settingsData.theme_header_layout as ThemeTokens['headerLayout']) || fallback.headerLayout,
    headerBorderStyle:
      (settingsData.theme_header_border_style as ThemeTokens['headerBorderStyle']) ||
      fallback.headerBorderStyle,
    headerTitleSize: settingsData.theme_header_title_size || fallback.headerTitleSize,
    headerNavTransform:
      (settingsData.theme_header_nav_transform as ThemeTokens['headerNavTransform']) ||
      fallback.headerNavTransform,
    headerPadding: settingsData.theme_header_padding || fallback.headerPadding,
    headerTagline: settingsData.theme_header_tagline ?? fallback.headerTagline,
  };
}

export function parseCustomThemes(raw?: string): CustomThemeEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) => item && typeof item.name === 'string' && item.tokens && typeof item.tokens === 'object'
      );
    }
  } catch (_) { }
  return [];
}

export function getDefaultCustomThemeName(
  selectedThemeName: string,
  customThemes: CustomThemeEntry[]
): string {
  if (BUILT_IN_THEMES[selectedThemeName]) {
    return `${selectedThemeName} Custom`;
  }
  const found = customThemes.find((t) => t.name === selectedThemeName);
  if (found?.baseTheme) {
    return `${found.baseTheme} Custom`;
  }
  return selectedThemeName.endsWith(' Custom')
    ? selectedThemeName
    : `${selectedThemeName} Custom`;
}

export interface ThemeEditorProps {
  initialTokens?: Partial<ThemeTokens>;
  initialThemeName?: string;
  initialPreviewMode?: 'editorial' | 'docs';
  onSaveSuccess?: () => void;
}

export const ThemeEditor: React.FC<ThemeEditorProps> = ({
  initialTokens,
  initialThemeName = 'Modern Editorial',
  initialPreviewMode = 'editorial',
  onSaveSuccess,
}) => {
  const queryClient = useQueryClient();
  const hasInitializedRef = useRef(false);

  const { data: settingsData = {}, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiFetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const basePreset = BUILT_IN_THEMES[initialThemeName] || MODERN_EDITORIAL_PRESET;

  const [activeThemeName, setActiveThemeName] = useState<string>(initialThemeName);
  const [selectedThemeName, setSelectedThemeName] = useState<string>(initialThemeName);
  const [customThemes, setCustomThemes] = useState<CustomThemeEntry[]>([]);

  const [tokens, setTokens] = useState<ThemeTokens>(() => ({
    ...basePreset,
    ...initialTokens,
  }));

  const [baselineTokens, setBaselineTokens] = useState<ThemeTokens>(() => ({
    ...basePreset,
    ...initialTokens,
  }));

  const [previewMode, setPreviewMode] = useState<'editorial' | 'docs'>(initialPreviewMode);

  // Dialog & feedback states
  const [pendingThemeSwitch, setPendingThemeSwitch] = useState<string | null>(null);
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [switchAfterSaveAs, setSwitchAfterSaveAs] = useState(false);

  const [saved, setSaved] = useState(false);
  const [switchedFeedback, setSwitchedFeedback] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with fetched settings on initial load
  useEffect(() => {
    if (
      !initialTokens &&
      settingsData &&
      Object.keys(settingsData).length > 0 &&
      !hasInitializedRef.current
    ) {
      hasInitializedRef.current = true;
      const loadedCustom = parseCustomThemes(settingsData.theme_custom_themes);
      setCustomThemes(loadedCustom);

      const loadedActiveName = settingsData.theme_active_name || initialThemeName;
      setActiveThemeName(loadedActiveName);
      setSelectedThemeName(loadedActiveName);

      const fallbackPreset =
        BUILT_IN_THEMES[loadedActiveName] ||
        loadedCustom.find((c) => c.name === loadedActiveName)?.tokens ||
        MODERN_EDITORIAL_PRESET;

      const loadedTokens = extractTokensFromSettings(settingsData, fallbackPreset);
      setTokens(loadedTokens);
      setBaselineTokens(loadedTokens);
    }
  }, [settingsData, initialThemeName, initialTokens]);

  // Dynamically inject Google Fonts into preview document
  useEffect(() => {
    if (!tokens.fontUrl) return;
    const existing = document.getElementById('zygo-theme-preview-font');
    if (existing) {
      existing.setAttribute('href', tokens.fontUrl);
    } else {
      const link = document.createElement('link');
      link.id = 'zygo-theme-preview-font';
      link.rel = 'stylesheet';
      link.href = tokens.fontUrl;
      document.head.appendChild(link);
    }
  }, [tokens.fontUrl]);

  const isDirty = !areTokensEqual(tokens, baselineTokens);
  const isBuiltInSelected = Boolean(BUILT_IN_THEMES[selectedThemeName]);

  const { blocker } = useUnsavedChangesBlocker(isDirty);

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        let msg = 'Failed to save theme settings';
        try {
          const errData = await res.json();
          if (errData?.error || errData?.message) msg = errData.error || errData.message;
        } catch (_) { }
        throw new Error(msg);
      }
      return res.json();
    },
  });

  const resolveThemeTokens = (
    themeName: string,
    customList: CustomThemeEntry[] = customThemes
  ): ThemeTokens => {
    if (BUILT_IN_THEMES[themeName]) {
      return { ...BUILT_IN_THEMES[themeName] };
    }
    const found = customList.find((c) => c.name === themeName);
    if (found) {
      return { ...found.tokens };
    }
    return { ...MODERN_EDITORIAL_PRESET };
  };

  const applyThemeSelection = (themeName: string) => {
    const nextTokens = resolveThemeTokens(themeName);
    setSelectedThemeName(themeName);
    setTokens(nextTokens);
    setBaselineTokens(nextTokens);
    setPendingThemeSwitch(null);
    setError(null);
  };

  const handleThemePickerChange = (nextThemeName: string) => {
    if (nextThemeName === selectedThemeName) return;
    if (isDirty) {
      setPendingThemeSwitch(nextThemeName);
    } else {
      applyThemeSelection(nextThemeName);
    }
  };

  const openSaveAsDialog = (shouldSwitchLiveAfter = false) => {
    const defaultName = getDefaultCustomThemeName(selectedThemeName, customThemes);
    setSaveAsName(defaultName);
    setSwitchAfterSaveAs(shouldSwitchLiveAfter);
    setSaveAsDialogOpen(true);
  };

  const handleSave = async () => {
    setError(null);
    // Built-in themes are read-only presets: clicking Save opens the Save As dialog
    if (isBuiltInSelected) {
      openSaveAsDialog(false);
      return;
    }

    // Saving an existing custom theme in-place
    try {
      const baseTheme =
        customThemes.find((t) => t.name === selectedThemeName)?.baseTheme || 'Modern Editorial';
      const updatedEntry: CustomThemeEntry = {
        name: selectedThemeName,
        baseTheme,
        tokens: { ...tokens },
      };
      const updatedCustomList = customThemes.some((t) => t.name === selectedThemeName)
        ? customThemes.map((t) => (t.name === selectedThemeName ? updatedEntry : t))
        : [...customThemes, updatedEntry];

      const payload: Record<string, string> = {
        theme_custom_themes: JSON.stringify(updatedCustomList),
      };

      // If this custom theme is currently active on the live site, update live tokens too
      if (activeThemeName === selectedThemeName) {
        Object.assign(payload, tokensToSettingsPayload(tokens), {
          theme_active_name: selectedThemeName,
        });
      }

      await updateSettingsMutation.mutateAsync(payload);

      setCustomThemes(updatedCustomList);
      setBaselineTokens({ ...tokens });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaveSuccess?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to save theme settings');
    }
  };

  const handleConfirmSaveAs = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    let targetName = saveAsName.trim();
    if (!targetName) {
      targetName = getDefaultCustomThemeName(selectedThemeName, customThemes);
    }
    if (BUILT_IN_THEMES[targetName]) {
      targetName = `${targetName} Custom`;
    }

    const baseTheme = BUILT_IN_THEMES[selectedThemeName]
      ? selectedThemeName
      : customThemes.find((t) => t.name === selectedThemeName)?.baseTheme || 'Modern Editorial';

    const newEntry: CustomThemeEntry = {
      name: targetName,
      baseTheme,
      tokens: { ...tokens },
    };

    const updatedCustomList = customThemes.some((t) => t.name === targetName)
      ? customThemes.map((t) => (t.name === targetName ? newEntry : t))
      : [...customThemes, newEntry];

    try {
      const payload: Record<string, string> = {
        theme_custom_themes: JSON.stringify(updatedCustomList),
      };

      if (switchAfterSaveAs || activeThemeName === targetName) {
        Object.assign(payload, tokensToSettingsPayload(tokens), {
          theme_active_name: targetName,
        });
      }

      await updateSettingsMutation.mutateAsync(payload);

      setCustomThemes(updatedCustomList);
      setSelectedThemeName(targetName);
      setBaselineTokens({ ...tokens });
      if (switchAfterSaveAs) {
        setActiveThemeName(targetName);
        setSwitchedFeedback(true);
        setTimeout(() => setSwitchedFeedback(false), 2000);
      }
      setSaveAsDialogOpen(false);
      setSwitchAfterSaveAs(false);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaveSuccess?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to save custom theme');
    }
  };

  const handleSwitchActiveTheme = async () => {
    setError(null);
    // If user modified a built-in theme and clicks Switch To, prompt Save As first
    if (isDirty && isBuiltInSelected) {
      openSaveAsDialog(true);
      return;
    }

    try {
      const payload: Record<string, string> = {
        ...tokensToSettingsPayload(tokens),
        theme_active_name: selectedThemeName,
      };

      // If switching to a dirty custom theme, also save its custom theme entry
      if (isDirty && !isBuiltInSelected) {
        const baseTheme =
          customThemes.find((t) => t.name === selectedThemeName)?.baseTheme || 'Modern Editorial';
        const updatedEntry: CustomThemeEntry = {
          name: selectedThemeName,
          baseTheme,
          tokens: { ...tokens },
        };
        const updatedCustomList = customThemes.some((t) => t.name === selectedThemeName)
          ? customThemes.map((t) => (t.name === selectedThemeName ? updatedEntry : t))
          : [...customThemes, updatedEntry];
        payload.theme_custom_themes = JSON.stringify(updatedCustomList);
        setCustomThemes(updatedCustomList);
      }

      await updateSettingsMutation.mutateAsync(payload);

      setActiveThemeName(selectedThemeName);
      setBaselineTokens({ ...tokens });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSwitchedFeedback(true);
      setTimeout(() => setSwitchedFeedback(false), 2000);
      onSaveSuccess?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to switch active theme');
    }
  };

  const handleApplyFontPreset = (preset: (typeof FONT_PRESETS)[0]) => {
    setTokens((prev) => ({
      ...prev,
      fontUrl: preset.url,
      fontHeadline: preset.headlineFont,
      fontBody: preset.bodyFont,
    }));
  };

  const handleResetToModernEditorial = () => {
    setTokens({ ...MODERN_EDITORIAL_PRESET });
  };

  useThemeEditorWebMCP({
    tokens,
    setTokens,
    onReset: handleResetToModernEditorial,
  });

  const borderBottomCss =
    tokens.headerBorderStyle === 'double'
      ? `3px double ${tokens.colorBorder}`
      : tokens.headerBorderStyle === 'solid'
        ? `1px solid ${tokens.colorBorder}`
        : 'none';

  const generatedCss = `:root {
  --font-headline: ${tokens.fontHeadline};
  --font-body: ${tokens.fontBody};
  --color-bg: ${tokens.colorBg};
  --color-text: ${tokens.colorText};
  --color-text-muted: ${tokens.colorTextMuted};
  --color-accent: ${tokens.colorAccent};
  --color-surface: ${tokens.colorSurface};
  --color-border: ${tokens.colorBorder};
  --content-max-width: ${tokens.maxWidth};
  --font-size-base: ${tokens.fontSizeBase};
  --line-height-body: ${tokens.lineHeightBody};
  /* Header styling tokens */
  --header-layout: ${tokens.headerLayout};
  --header-border-style: ${tokens.headerBorderStyle};
  --header-border: ${borderBottomCss};
  --header-title-size: ${tokens.headerTitleSize};
  --header-nav-transform: ${tokens.headerNavTransform};
  --header-padding: ${tokens.headerPadding};
}`;

  const handleCopyCss = () => {
    navigator.clipboard.writeText(generatedCss);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2000);
  };

  const canSwitchToSelected = selectedThemeName !== activeThemeName || isDirty;

  if (isLoading && !initialTokens && Object.keys(settingsData).length === 0) {
    return <Box p="4">Loading theme settings...</Box>;
  }

  return (
    <Box style={{ maxWidth: '2000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Header */}
      <Flex justify="between" align="start" mb="5" wrap="wrap" gap="4">
        <Box>
          <Flex align="center" gap="2">
            <ColorWheelIcon width="24" height="24" style={{ color: 'var(--cyan-9)' }} />
            <Heading size="6" weight="bold">
              Theme Settings
            </Heading>
            <Badge color="cyan" variant="soft">
              {selectedThemeName}
            </Badge>
            {isDirty && (
              <Badge color="amber" variant="soft">
                Unsaved Edits
              </Badge>
            )}
          </Flex>
          <Text size="2" color="gray" mt="1" as="div">
            Configure typography, Google Fonts, header styles, and design tokens via CSS variables
          </Text>
        </Box>

        {/* Right Controls Stack: Active Theme Row on top, Theme Picker + Save / Save As below */}
        <Flex direction="column" align="end" gap="2">
          {/* Active Theme & Switch To Bar */}
          <Flex align="center" gap="3" wrap="wrap" justify="end">
            <Text size="2" weight="medium" data-testid="active-theme-indicator">
              Active theme: <strong>{activeThemeName}</strong>
            </Text>
            <Button
              size="1"
              variant={selectedThemeName !== activeThemeName ? 'solid' : 'soft'}
              color="cyan"
              disabled={!canSwitchToSelected || updateSettingsMutation.isPending}
              onClick={handleSwitchActiveTheme}
            >
              {switchedFeedback ? (
                <>
                  <CheckIcon width="14" height="14" /> Active!
                </>
              ) : (
                `Switch to: ${selectedThemeName}`
              )}
            </Button>
          </Flex>

          {/* Theme Picker Dropdown + Save / Save As Buttons */}
          <Flex gap="2" align="center" wrap="wrap" justify="end">
            <Select.Root value={selectedThemeName} onValueChange={handleThemePickerChange}>
              <Select.Trigger
                aria-label="Theme Picker"
                style={{ minWidth: '210px' }}
              />
              <Select.Content>
                <Select.Group>
                  <Select.Label>Built-in Themes</Select.Label>
                  {Object.keys(BUILT_IN_THEMES).map((name) => (
                    <Select.Item key={name} value={name}>
                      {name}
                    </Select.Item>
                  ))}
                </Select.Group>
                {customThemes.length > 0 && (
                  <>
                    <Select.Separator />
                    <Select.Group>
                      <Select.Label>Custom Themes</Select.Label>
                      {customThemes.map((ct) => (
                        <Select.Item key={ct.name} value={ct.name}>
                          {ct.name}
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </>
                )}
              </Select.Content>
            </Select.Root>

            <Button
              variant="solid"
              color="cyan"
              onClick={handleSave}
              disabled={!isDirty || updateSettingsMutation.isPending}
            >
              {saved ? (
                <>
                  <CheckIcon width="16" height="16" /> Saved!
                </>
              ) : updateSettingsMutation.isPending ? (
                'Saving...'
              ) : (
                'Save'
              )}
            </Button>

            <Button
              variant="outline"
              color="cyan"
              onClick={() => openSaveAsDialog(false)}
              disabled={updateSettingsMutation.isPending}
            >
              Save As...
            </Button>
          </Flex>
        </Flex>
      </Flex>

      {error && (
        <Callout.Root color="red" size="2" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      {/* Main Grid: Form Controls Left, Live Editorial Preview Right */}
      <Grid columns={{ initial: '1', md: '1fr 1fr', lg: '600px 1fr' }} gap="5">
        {/* Left Column: Fonts, Header Styles & Design Tokens */}
        <Flex direction="column" gap="4">
          {/* Section 1: Header Styling */}
          <Card size="2">
            <Flex align="center" gap="2" mb="2">
              <HeadingIcon width="18" height="18" style={{ color: 'var(--cyan-9)' }} />
              <Heading size="3">Header & Masthead Styling</Heading>
            </Flex>
            <Text size="2" color="gray" mb="3" as="div">
              Customize publication header layout, borders, and navigation styling.
            </Text>

            {/* Header Layout Selector */}
            <Box mb="4">
              <Text as="label" size="2" weight="bold" mb="2" style={{ display: 'block' }}>
                Header Layout
              </Text>
              <Grid columns="3" gap="2">
                {[
                  {
                    id: 'centered',
                    label: 'Centered Masthead',
                    desc: 'Classic editorial journal',
                    icon: <TextAlignCenterIcon />,
                  },
                  {
                    id: 'split',
                    label: 'Split Bar',
                    desc: 'Brand left, nav right',
                    icon: <TextAlignLeftIcon />,
                  },
                  {
                    id: 'stacked',
                    label: 'Stacked Minimal',
                    desc: 'Brand top, nav below',
                    icon: <BorderBottomIcon />,
                  },
                ].map((item) => {
                  const isSelected = tokens.headerLayout === item.id;
                  return (
                    <Box
                      key={item.id}
                      p="2"
                      onClick={() =>
                        setTokens((prev) => ({
                          ...prev,
                          headerLayout: item.id as ThemeTokens['headerLayout'],
                        }))
                      }
                      style={{
                        borderRadius: '6px',
                        border: isSelected ? '1px solid var(--cyan-8)' : '1px solid var(--gray-a4)',
                        backgroundColor: isSelected ? 'var(--cyan-a3)' : 'var(--color-surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Flex align="center" gap="1" mb="1">
                        {item.icon}
                        <Text size="2" weight={isSelected ? 'bold' : 'medium'}>
                          {item.label}
                        </Text>
                      </Flex>
                      <Text size="1" color="gray">
                        {item.desc}
                      </Text>
                    </Box>
                  );
                })}
              </Grid>
            </Box>

            {/* Header Border Style */}
            <Box mb="4">
              <Text as="label" size="2" weight="bold" mb="2" style={{ display: 'block' }}>
                Header Border Style
              </Text>
              <Grid columns="3" gap="2">
                {[
                  {
                    id: 'double',
                    label: 'Double Border',
                    desc: 'Classic editorial signature (3px double)',
                  },
                  {
                    id: 'solid',
                    label: 'Single Solid',
                    desc: 'Clean structural border',
                  },
                  {
                    id: 'none',
                    label: 'None',
                    desc: 'Seamless borderless',
                  },
                ].map((border) => {
                  const isSelected = tokens.headerBorderStyle === border.id;
                  return (
                    <Box
                      key={border.id}
                      p="2"
                      onClick={() =>
                        setTokens((prev) => ({
                          ...prev,
                          headerBorderStyle: border.id as ThemeTokens['headerBorderStyle'],
                        }))
                      }
                      style={{
                        borderRadius: '6px',
                        border: isSelected ? '1px solid var(--cyan-8)' : '1px solid var(--gray-a4)',
                        backgroundColor: isSelected ? 'var(--cyan-a3)' : 'var(--color-surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Text size="2" weight={isSelected ? 'bold' : 'medium'} as="div">
                        {border.label}
                      </Text>
                      <Text size="1" color="gray">
                        {border.desc}
                      </Text>
                    </Box>
                  );
                })}
              </Grid>
            </Box>

            <Grid columns="2" gap="3" mb="3">
              {/* Brand Title Size */}
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Masthead Title Size (<code>--header-title-size</code>)
                </Text>
                <TextField.Root
                  value={tokens.headerTitleSize}
                  placeholder="2rem"
                  onChange={(e) =>
                    setTokens((prev) => ({ ...prev, headerTitleSize: e.target.value }))
                  }
                />
              </Box>

              {/* Nav Text Transform */}
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Navigation Lettering (<code>--header-nav-transform</code>)
                </Text>
                <Flex gap="2" mt="1">
                  <Button
                    size="2"
                    variant={tokens.headerNavTransform === 'uppercase' ? 'solid' : 'outline'}
                    color="cyan"
                    style={{ flex: 1 }}
                    onClick={() =>
                      setTokens((prev) => ({ ...prev, headerNavTransform: 'uppercase' }))
                    }
                  >
                    UPPERCASE
                  </Button>
                  <Button
                    size="2"
                    variant={tokens.headerNavTransform === 'none' ? 'solid' : 'outline'}
                    color="cyan"
                    style={{ flex: 1 }}
                    onClick={() =>
                      setTokens((prev) => ({ ...prev, headerNavTransform: 'none' }))
                    }
                  >
                    Normal Case
                  </Button>
                </Flex>
              </Box>
            </Grid>

            <Grid columns="2" gap="3">
              {/* Header Tagline / Subtitle */}
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Editorial Tagline
                </Text>
                <TextField.Root
                  value={tokens.headerTagline}
                  placeholder="An Editorial Review & Journal"
                  onChange={(e) =>
                    setTokens((prev) => ({ ...prev, headerTagline: e.target.value }))
                  }
                />
              </Box>

              {/* Header Padding */}
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Header Padding (<code>--header-padding</code>)
                </Text>
                <TextField.Root
                  value={tokens.headerPadding}
                  placeholder="1.75rem 0 1.25rem 0"
                  onChange={(e) =>
                    setTokens((prev) => ({ ...prev, headerPadding: e.target.value }))
                  }
                />
              </Box>
            </Grid>
          </Card>

          {/* Section 2: Font Picker & Google Fonts */}
          <Card size="2">
            <Flex align="center" gap="2" mb="2">
              <FontFamilyIcon width="18" height="18" style={{ color: 'var(--cyan-9)' }} />
              <Heading size="3">Pick a Font & Google Fonts</Heading>
            </Flex>
            <Text size="2" color="gray" mb="3" as="div">
              Choose an editorial or technical pairing below, or copy your Google Fonts details here.
            </Text>

            {/* Google Fonts External Link & Instructions Box */}
            <Box
              p="3"
              mb="4"
              style={{
                backgroundColor: 'var(--gray-a2)',
                borderRadius: '8px',
                border: '1px solid var(--gray-a4)',
              }}
            >
              <Flex justify="between" align="center" mb="2">
                <Text size="2" weight="bold">
                  Browse Google Fonts
                </Text>
                <Button size="1" variant="surface" color="cyan" asChild>
                  <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer">
                    Open Google Fonts <ExternalLinkIcon width="14" height="14" />
                  </a>
                </Button>
              </Flex>
              <Text size="1" color="gray" as="div" style={{ lineHeight: 1.6 }}>
                <strong>How to copy fonts back to Zygo:</strong>
                <ol style={{ paddingLeft: '1.2rem', marginTop: '0.25rem', marginBottom: 0 }}>
                  <li>Search and select your font styles on Google Fonts (e.g., 400, 600, 700).</li>
                  <li>Click <em>Get embed code</em> &rarr; <em>Web (&lt;link&gt;)</em>.</li>
                  <li>
                    Copy the stylesheet URL starting with <code>https://fonts.googleapis.com/...</code>{' '}
                    and paste into the Embed URL field below.
                  </li>
                  <li>
                    Copy the CSS font name (e.g., <code>&apos;Playfair Display&apos;, serif</code>) and
                    paste it into the Headline or Body field.
                  </li>
                </ol>
              </Text>
            </Box>

            {/* Curated Font Pairings */}
            <Box mb="4">
              <Text size="2" weight="bold" mb="2" as="div">
                Curated Typography Pairings
              </Text>
              <Flex direction="column" gap="2">
                {FONT_PRESETS.map((p) => {
                  const isSelected =
                    tokens.fontHeadline === p.headlineFont && tokens.fontBody === p.bodyFont;
                  return (
                    <Box
                      key={p.name}
                      p="2"
                      onClick={() => handleApplyFontPreset(p)}
                      style={{
                        borderRadius: '6px',
                        border: isSelected ? '1px solid var(--cyan-8)' : '1px solid var(--gray-a4)',
                        backgroundColor: isSelected ? 'var(--cyan-a3)' : 'var(--color-surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Flex justify="between" align="center">
                        <Text size="2" weight={isSelected ? 'bold' : 'medium'}>
                          {p.name}
                        </Text>
                        {isSelected && (
                          <Badge color="cyan" size="1">
                            Active
                          </Badge>
                        )}
                      </Flex>
                      <Text size="1" color="gray">
                        {p.description}
                      </Text>
                    </Box>
                  );
                })}
              </Flex>
            </Box>

            <Separator size="4" my="3" />

            {/* Font Inputs */}
            <Box mb="3">
              <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                Google Fonts Embed URL
              </Text>
              <TextField.Root
                value={tokens.fontUrl}
                placeholder="https://fonts.googleapis.com/css2?family=..."
                onChange={(e) =>
                  setTokens((prev) => ({
                    ...prev,
                    fontUrl: cleanGoogleFontUrl(e.target.value),
                  }))
                }
              />
              <Text size="1" color="gray" mt="1" as="div">
                Accepts either the direct URL or a full <code>&lt;link href=&quot;...&quot;&gt;</code> tag.
              </Text>
            </Box>

            <Grid columns="2" gap="3">
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Headline Font Family (<code>--font-headline</code>)
                </Text>
                <TextField.Root
                  value={tokens.fontHeadline}
                  placeholder="'Newsreader', Georgia, serif"
                  onChange={(e) =>
                    setTokens((prev) => ({ ...prev, fontHeadline: e.target.value }))
                  }
                />
              </Box>
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Body Font Family (<code>--font-body</code>)
                </Text>
                <TextField.Root
                  value={tokens.fontBody}
                  placeholder="'Inter', sans-serif"
                  onChange={(e) =>
                    setTokens((prev) => ({ ...prev, fontBody: e.target.value }))
                  }
                />
              </Box>
            </Grid>
          </Card>

          {/* Section 3: Color Design Tokens */}
          <Card size="2">
            <Flex align="center" gap="2" mb="2">
              <ColorWheelIcon width="18" height="18" style={{ color: 'var(--cyan-9)' }} />
              <Heading size="3">Color Design Tokens (CSS Variables)</Heading>
            </Flex>
            <Text size="2" color="gray" mb="3" as="div">
              Adjust color variables or apply rich CMYK print-shop ink accents.
            </Text>

            {/* Quick CMYK Print-Shop Accent Swatches */}
            <Box mb="3">
              <Text size="1" weight="bold" color="gray" mb="1" as="div">
                CMYK Print-Shop Accent Inks (Click to set Accent)
              </Text>
              <Flex gap="2" wrap="wrap">
                {CMYK_INK_SWATCHES.map((swatch) => (
                  <Button
                    key={swatch.hex}
                    size="1"
                    variant="outline"
                    color="gray"
                    onClick={() => setTokens((prev) => ({ ...prev, colorAccent: swatch.hex }))}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '10px',
                        height: '10px',
                        borderRadius: '2px',
                        backgroundColor: swatch.hex,
                      }}
                    />
                    {swatch.name}
                  </Button>
                ))}
              </Flex>
            </Box>

            <Grid columns="2" gap="3">
              {/* Background Color */}
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Background (<code>--color-bg</code>)
                </Text>
                <Flex gap="2" align="center">
                  <input
                    type="color"
                    value={tokens.colorBg}
                    aria-label="Color picker for Page Background"
                    onChange={(e) => setTokens((prev) => ({ ...prev, colorBg: e.target.value }))}
                    style={{
                      width: '36px',
                      height: '36px',
                      padding: 0,
                      border: '1px solid var(--gray-a5)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  />
                  <TextField.Root
                    style={{ flex: 1 }}
                    value={tokens.colorBg}
                    onChange={(e) => setTokens((prev) => ({ ...prev, colorBg: e.target.value }))}
                  />
                </Flex>
              </Box>

              {/* Text Color */}
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Text (<code>--color-text</code>)
                </Text>
                <Flex gap="2" align="center">
                  <input
                    type="color"
                    value={tokens.colorText}
                    aria-label="Color picker for Text"
                    onChange={(e) => setTokens((prev) => ({ ...prev, colorText: e.target.value }))}
                    style={{
                      width: '36px',
                      height: '36px',
                      padding: 0,
                      border: '1px solid var(--gray-a5)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  />
                  <TextField.Root
                    style={{ flex: 1 }}
                    value={tokens.colorText}
                    onChange={(e) => setTokens((prev) => ({ ...prev, colorText: e.target.value }))}
                  />
                </Flex>
              </Box>

              {/* Accent Color */}
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Accent (<code>--color-accent</code>)
                </Text>
                <Flex gap="2" align="center">
                  <input
                    type="color"
                    value={tokens.colorAccent}
                    aria-label="Color picker for Accent Color"
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, colorAccent: e.target.value }))
                    }
                    style={{
                      width: '36px',
                      height: '36px',
                      padding: 0,
                      border: '1px solid var(--gray-a5)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  />
                  <TextField.Root
                    style={{ flex: 1 }}
                    value={tokens.colorAccent}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, colorAccent: e.target.value }))
                    }
                  />
                </Flex>
              </Box>

              {/* Muted Text Color */}
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Muted Text (<code>--color-text-muted</code>)
                </Text>
                <Flex gap="2" align="center">
                  <input
                    type="color"
                    value={tokens.colorTextMuted}
                    aria-label="Color picker for Muted Text"
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, colorTextMuted: e.target.value }))
                    }
                    style={{
                      width: '36px',
                      height: '36px',
                      padding: 0,
                      border: '1px solid var(--gray-a5)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  />
                  <TextField.Root
                    style={{ flex: 1 }}
                    value={tokens.colorTextMuted}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, colorTextMuted: e.target.value }))
                    }
                  />
                </Flex>
              </Box>

              {/* Surface / Card */}
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Surface / Card (<code>--color-surface</code>)
                </Text>
                <Flex gap="2" align="center">
                  <input
                    type="color"
                    value={tokens.colorSurface}
                    aria-label="Color picker for Surface Color"
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, colorSurface: e.target.value }))
                    }
                    style={{
                      width: '36px',
                      height: '36px',
                      padding: 0,
                      border: '1px solid var(--gray-a5)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  />
                  <TextField.Root
                    style={{ flex: 1 }}
                    value={tokens.colorSurface}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, colorSurface: e.target.value }))
                    }
                  />
                </Flex>
              </Box>

              {/* Border Color */}
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Border (<code>--color-border</code>)
                </Text>
                <Flex gap="2" align="center">
                  <input
                    type="color"
                    value={tokens.colorBorder}
                    aria-label="Color picker for Border Color"
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, colorBorder: e.target.value }))
                    }
                    style={{
                      width: '36px',
                      height: '36px',
                      padding: 0,
                      border: '1px solid var(--gray-a5)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  />
                  <TextField.Root
                    style={{ flex: 1 }}
                    value={tokens.colorBorder}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, colorBorder: e.target.value }))
                    }
                  />
                </Flex>
              </Box>
            </Grid>
          </Card>

          {/* Section 4: Layout & Sizing Tokens */}
          <Card size="2">
            <Heading size="3" mb="2">
              Layout & Sizing Tokens
            </Heading>
            <Grid columns="3" gap="3">
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Max Width (<code>--content-max-width</code>)
                </Text>
                <TextField.Root
                  value={tokens.maxWidth}
                  placeholder="740px"
                  onChange={(e) => setTokens((prev) => ({ ...prev, maxWidth: e.target.value }))}
                />
              </Box>
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Base Font Size (<code>--font-size-base</code>)
                </Text>
                <TextField.Root
                  value={tokens.fontSizeBase}
                  placeholder="18px"
                  onChange={(e) => setTokens((prev) => ({ ...prev, fontSizeBase: e.target.value }))}
                />
              </Box>
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Line Height (<code>--line-height-body</code>)
                </Text>
                <TextField.Root
                  value={tokens.lineHeightBody}
                  placeholder="1.75"
                  onChange={(e) =>
                    setTokens((prev) => ({ ...prev, lineHeightBody: e.target.value }))
                  }
                />
              </Box>
            </Grid>
          </Card>
        </Flex>

        {/* Right Column: Live Editorial & Docs Preview + CSS Export */}
        <Flex direction="column" gap="4">
          <Card size="2" style={{ position: 'sticky', top: '1rem' }}>
            <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
              <Flex align="center" gap="2">
                <Heading size="3">Live Editorial Preview</Heading>
                <Badge color="green" variant="soft">
                  Dynamic Preview
                </Badge>
              </Flex>
              <Flex gap="1" role="group" aria-label="Preview layout mode">
                <Button
                  size="1"
                  variant={previewMode === 'editorial' ? 'solid' : 'soft'}
                  color="cyan"
                  onClick={() => setPreviewMode('editorial')}
                >
                  Editorial / Bento
                </Button>
                <Button
                  size="1"
                  variant={previewMode === 'docs' ? 'solid' : 'soft'}
                  color="cyan"
                  onClick={() => setPreviewMode('docs')}
                >
                  Docs Layout
                </Button>
              </Flex>
            </Flex>

            {/* The Live Rendered Preview Container with WebMCP subtle dotted texture */}
            <Box
              data-testid="editorial-preview-container"
              p="5"
              style={{
                backgroundColor: tokens.colorBg,
                backgroundImage: `radial-gradient(color-mix(in srgb, ${tokens.colorText} 7%, transparent) 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
                color: tokens.colorText,
                borderRadius: '8px',
                border: `1px solid ${tokens.colorBorder}`,
                fontFamily: tokens.fontBody,
                fontSize: tokens.fontSizeBase,
                lineHeight: tokens.lineHeightBody,
                transition: 'all 0.2s ease',
                overflow: 'hidden',
              }}
            >
              {/* Dynamic Header Component based on Header Styling */}
              {tokens.headerLayout === 'centered' ? (
                <Box
                  data-testid="preview-header-centered"
                  pb="3"
                  mb="4"
                  style={{
                    borderBottom: borderBottomCss,
                    padding: tokens.headerPadding,
                    textAlign: 'center',
                  }}
                >
                  <Text
                    weight="bold"
                    as="div"
                    style={{
                      fontFamily: tokens.fontHeadline,
                      fontSize: tokens.headerTitleSize,
                      color: tokens.colorText,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.15,
                    }}
                  >
                    The Zygo Review
                  </Text>
                  {tokens.headerTagline && (
                    <Text
                      size="1"
                      as="div"
                      style={{
                        color: tokens.colorTextMuted,
                        fontStyle: 'italic',
                        fontFamily: tokens.fontHeadline,
                        marginTop: '0.25rem',
                      }}
                    >
                      {tokens.headerTagline}
                    </Text>
                  )}
                  <Flex gap="2" mt="3" justify="center" wrap="wrap">
                    <span
                      style={{
                        color: tokens.colorText,
                        backgroundColor: tokens.colorSurface,
                        border: `1px solid ${tokens.colorBorder}`,
                        boxShadow: `2px 2px 0px color-mix(in srgb, ${tokens.colorBorder} 22%, transparent)`,
                        borderRadius: '5px',
                        padding: '0.25rem 0.6rem',
                        fontWeight: 700,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing:
                          tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.78rem',
                      }}
                    >
                      Essays
                    </span>
                    <span
                      style={{
                        color: tokens.colorTextMuted,
                        padding: '0.25rem 0.6rem',
                        fontWeight: 600,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing:
                          tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.78rem',
                      }}
                    >
                      Docs
                    </span>
                    <span
                      style={{
                        color: tokens.colorTextMuted,
                        padding: '0.25rem 0.6rem',
                        fontWeight: 600,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing:
                          tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.78rem',
                      }}
                    >
                      About
                    </span>
                  </Flex>
                </Box>
              ) : tokens.headerLayout === 'split' ? (
                <Flex
                  data-testid="preview-header-split"
                  justify="between"
                  align="center"
                  pb="3"
                  mb="4"
                  wrap="wrap"
                  gap="2"
                  style={{
                    borderBottom: borderBottomCss,
                    padding: tokens.headerPadding,
                  }}
                >
                  <Box>
                    <Text
                      weight="bold"
                      as="div"
                      style={{
                        fontFamily: tokens.fontHeadline,
                        fontSize: tokens.headerTitleSize,
                        color: tokens.colorText,
                        letterSpacing: '-0.02em',
                        lineHeight: 1.15,
                      }}
                    >
                      The Zygo Review
                    </Text>
                    {tokens.headerTagline && (
                      <Text
                        size="1"
                        as="div"
                        style={{
                          color: tokens.colorTextMuted,
                          fontStyle: 'italic',
                          fontFamily: tokens.fontHeadline,
                          marginTop: '0.15rem',
                        }}
                      >
                        {tokens.headerTagline}
                      </Text>
                    )}
                  </Box>
                  <Flex gap="2" align="center">
                    <span
                      style={{
                        color: tokens.colorText,
                        backgroundColor: tokens.colorSurface,
                        border: `1px solid ${tokens.colorBorder}`,
                        boxShadow: `2px 2px 0px color-mix(in srgb, ${tokens.colorBorder} 22%, transparent)`,
                        borderRadius: '5px',
                        padding: '0.25rem 0.6rem',
                        fontWeight: 700,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing:
                          tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.78rem',
                      }}
                    >
                      Essays
                    </span>
                    <span
                      style={{
                        color: tokens.colorTextMuted,
                        padding: '0.25rem 0.6rem',
                        fontWeight: 600,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing:
                          tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.78rem',
                      }}
                    >
                      Docs
                    </span>
                    <span
                      style={{
                        color: tokens.colorTextMuted,
                        padding: '0.25rem 0.6rem',
                        fontWeight: 600,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing:
                          tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.78rem',
                      }}
                    >
                      About
                    </span>
                  </Flex>
                </Flex>
              ) : (
                <Box
                  data-testid="preview-header-stacked"
                  pb="3"
                  mb="4"
                  style={{
                    borderBottom: borderBottomCss,
                    padding: tokens.headerPadding,
                  }}
                >
                  <Text
                    weight="bold"
                    as="div"
                    style={{
                      fontFamily: tokens.fontHeadline,
                      fontSize: tokens.headerTitleSize,
                      color: tokens.colorText,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.15,
                    }}
                  >
                    The Zygo Review
                  </Text>
                  {tokens.headerTagline && (
                    <Text
                      size="1"
                      as="div"
                      style={{
                        color: tokens.colorTextMuted,
                        fontStyle: 'italic',
                        fontFamily: tokens.fontHeadline,
                        marginTop: '0.15rem',
                      }}
                    >
                      {tokens.headerTagline}
                    </Text>
                  )}
                  <Flex gap="2" mt="3">
                    <span
                      style={{
                        color: tokens.colorText,
                        backgroundColor: tokens.colorSurface,
                        border: `1px solid ${tokens.colorBorder}`,
                        boxShadow: `2px 2px 0px color-mix(in srgb, ${tokens.colorBorder} 22%, transparent)`,
                        borderRadius: '5px',
                        padding: '0.25rem 0.6rem',
                        fontWeight: 700,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing:
                          tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.78rem',
                      }}
                    >
                      Essays
                    </span>
                    <span
                      style={{
                        color: tokens.colorTextMuted,
                        padding: '0.25rem 0.6rem',
                        fontWeight: 600,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing:
                          tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.78rem',
                      }}
                    >
                      Docs
                    </span>
                    <span
                      style={{
                        color: tokens.colorTextMuted,
                        padding: '0.25rem 0.6rem',
                        fontWeight: 600,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing:
                          tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.78rem',
                      }}
                    >
                      About
                    </span>
                  </Flex>
                </Box>
              )}

              {previewMode === 'editorial' ? (
                <Box data-testid="preview-mode-editorial">
                  {/* Tag / Category Badge */}
                  <Box mb="2">
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: tokens.colorAccent,
                      }}
                    >
                      Literature & Critique
                    </span>
                  </Box>

                  {/* Editorial Title */}
                  <h1
                    style={{
                      fontFamily: tokens.fontHeadline,
                      fontSize: '2rem',
                      lineHeight: 1.25,
                      margin: '0 0 0.75rem 0',
                      fontWeight: 700,
                      color: tokens.colorText,
                    }}
                  >
                    The Architecture of the Modern Digital Essay
                  </h1>

                  {/* Byline / Meta */}
                  <Flex
                    align="center"
                    gap="2"
                    mb="4"
                    style={{
                      color: tokens.colorTextMuted,
                      fontSize: '0.85rem',
                    }}
                  >
                    <span>By Clara Vance</span>
                    <span>&bull;</span>
                    <span>October 9, 2026</span>
                    <span>&bull;</span>
                    <span>6 min read</span>
                  </Flex>

                  {/* Pullquote */}
                  <blockquote
                    style={{
                      borderLeft: `3px solid ${tokens.colorAccent}`,
                      margin: '1.5rem 0',
                      paddingLeft: '1rem',
                      fontFamily: tokens.fontHeadline,
                      fontSize: '1.15rem',
                      fontStyle: 'italic',
                      color: tokens.colorText,
                    }}
                  >
                    &ldquo;Typography is the invisible medium that gives voice to the unspoken
                    rhythm of thought.&rdquo;
                  </blockquote>

                  {/* Body Paragraph */}
                  <p style={{ margin: '0 0 1rem 0' }}>
                    In an era dominated by relentless digital feeds, editorial craftsmanship demands
                    intentional typographic rhythm. When thoughtful proportions, harmonious
                    typefaces, and balanced whitespace meet, reading transforms into an immersive
                    sensory ritual.
                  </p>

                  {/* Sample Bento Card / Surface Element */}
                  <Box
                    p="3"
                    mt="4"
                    style={{
                      backgroundColor: tokens.colorSurface,
                      border: `1px solid ${tokens.colorBorder}`,
                      borderRadius: '8px',
                      boxShadow: `3px 3px 0px color-mix(in srgb, ${tokens.colorBorder} 22%, transparent)`,
                    }}
                  >
                    <Text size="1" weight="bold" style={{ color: tokens.colorAccent }}>
                      FEATURED DISPATCH
                    </Text>
                    <Text
                      size="2"
                      weight="medium"
                      as="div"
                      mt="1"
                      style={{ color: tokens.colorText }}
                    >
                      Subscribe to Weekly Editorial Letters
                    </Text>
                    <Text size="1" style={{ color: tokens.colorTextMuted }} mt="1" as="div">
                      In-depth essays and typographic studies delivered directly to your inbox.
                    </Text>
                  </Box>
                </Box>
              ) : (
                /* State of JS 2025 Inspired 3-Column Docs Preview */
                <Grid
                  data-testid="preview-mode-docs"
                  columns={{ initial: '1', sm: '150px 1fr 120px' }}
                  gap="3"
                  style={{ alignItems: 'start' }}
                >
                  {/* Left Docs Sidebar */}
                  <Box
                    p="2"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${tokens.colorSurface} 88%, transparent)`,
                      border: `1px solid ${tokens.colorBorder}`,
                      borderRadius: '8px',
                      boxShadow: `3px 3px 0px color-mix(in srgb, ${tokens.colorBorder} 18%, transparent)`,
                      fontSize: '0.78rem',
                    }}
                  >
                    <Box
                      mb="2"
                      p="1"
                      style={{
                        backgroundColor: tokens.colorSurface,
                        border: `1px solid ${tokens.colorBorder}`,
                        borderRadius: '4px',
                        color: tokens.colorTextMuted,
                        fontSize: '0.72rem',
                      }}
                    >
                      Search docs...
                    </Box>
                    <Text
                      size="1"
                      weight="bold"
                      as="div"
                      mb="1"
                      style={{
                        color: tokens.colorText,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        fontSize: '0.7rem',
                      }}
                    >
                      Core Concepts
                    </Text>
                    <Box
                      style={{
                        borderLeft: `1.5px solid ${tokens.colorBorder}`,
                        marginLeft: '0.25rem',
                        paddingLeft: '0.4rem',
                      }}
                    >
                      <div
                        style={{
                          padding: '0.25rem 0.4rem',
                          borderLeft: `3px solid ${tokens.colorAccent}`,
                          backgroundColor: `color-mix(in srgb, ${tokens.colorAccent} 12%, ${tokens.colorSurface})`,
                          color: tokens.colorAccent,
                          fontWeight: 700,
                          borderRadius: '0 4px 4px 0',
                          marginBottom: '0.2rem',
                        }}
                      >
                        Edge Caching
                      </div>
                      <div style={{ padding: '0.25rem 0.4rem', color: tokens.colorTextMuted }}>
                        D1 Schema
                      </div>
                      <div style={{ padding: '0.25rem 0.4rem', color: tokens.colorTextMuted }}>
                        WebMCP Bridge
                      </div>
                    </Box>
                  </Box>

                  {/* Center Docs Main Bento Article */}
                  <Box
                    p="3"
                    style={{
                      backgroundColor: tokens.colorSurface,
                      border: `1px solid ${tokens.colorBorder}`,
                      borderRadius: '8px',
                      boxShadow: `3px 3px 0px color-mix(in srgb, ${tokens.colorBorder} 18%, transparent)`,
                    }}
                  >
                    <h2
                      style={{
                        fontFamily: tokens.fontHeadline,
                        fontSize: '1.35rem',
                        fontWeight: 700,
                        margin: '0 0 0.5rem 0',
                        color: tokens.colorText,
                      }}
                    >
                      Edge Caching & Invalidation
                    </h2>
                    <p style={{ fontSize: '0.85rem', margin: '0 0 0.75rem 0' }}>
                      Zygo CMS caches rendered HTML at the Cloudflare edge and purges canonical
                      paths automatically on publish.
                    </p>
                    <pre
                      style={{
                        backgroundColor: '#18181b',
                        color: '#f4f4f5',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontFamily: 'ui-monospace, monospace',
                        margin: '0 0 0.75rem 0',
                        overflowX: 'auto',
                      }}
                    >
                      <code>cache::purge_urls(&amp;env, urls).await;</code>
                    </pre>
                    <Flex justify="between" gap="2" mt="3">
                      <span
                        style={{
                          padding: '0.3rem 0.6rem',
                          border: `1px solid ${tokens.colorBorder}`,
                          borderRadius: '5px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          boxShadow: `2px 2px 0px color-mix(in srgb, ${tokens.colorBorder} 22%, transparent)`,
                        }}
                      >
                        &larr; Getting Started
                      </span>
                      <span
                        style={{
                          padding: '0.3rem 0.6rem',
                          border: `1px solid ${tokens.colorBorder}`,
                          borderRadius: '5px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: tokens.colorAccent,
                          boxShadow: `2px 2px 0px color-mix(in srgb, ${tokens.colorBorder} 22%, transparent)`,
                        }}
                      >
                        D1 Schema &rarr;
                      </span>
                    </Flex>
                  </Box>

                  {/* Right TOC Rail */}
                  <Box
                    pl="2"
                    style={{
                      borderLeft: `1px solid ${tokens.colorBorder}`,
                      fontSize: '0.72rem',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: tokens.colorTextMuted,
                        marginBottom: '0.4rem',
                      }}
                    >
                      On this page
                    </div>
                    <div
                      style={{
                        color: tokens.colorAccent,
                        fontWeight: 600,
                        borderLeft: `2px solid ${tokens.colorAccent}`,
                        paddingLeft: '0.4rem',
                        marginLeft: '-0.55rem',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Cache Purge
                    </div>
                    <div style={{ color: tokens.colorTextMuted }}>Headers</div>
                  </Box>
                </Grid>
              )}
            </Box>

            <Separator size="4" my="3" />

            {/* Generated CSS Variables Snippet */}
            <Box>
              <Flex justify="between" align="center" mb="2">
                <Text size="2" weight="bold">
                  Generated CSS Variables
                </Text>
                <Button size="1" variant="ghost" color="gray" onClick={handleCopyCss}>
                  <CopyIcon width="14" height="14" /> {copiedCss ? 'Copied!' : 'Copy CSS'}
                </Button>
              </Flex>
              <pre
                style={{
                  backgroundColor: 'var(--gray-a3)',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  overflowX: 'auto',
                  fontFamily: 'ui-monospace, monospace',
                  margin: 0,
                }}
              >
                {generatedCss}
              </pre>
            </Box>
          </Card>
        </Flex>
      </Grid>

      {/* Unsaved Theme Changes Warning Dialog when picking a different theme */}
      <AlertDialog.Root
        open={Boolean(pendingThemeSwitch)}
        onOpenChange={(open) => {
          if (!open) setPendingThemeSwitch(null);
        }}
      >
        <AlertDialog.Content maxWidth="460px">
          <AlertDialog.Title>Are you sure you want to switch themes?</AlertDialog.Title>
          <AlertDialog.Description size="2">
            You have unsaved changes to <strong>{selectedThemeName}</strong>. Switching to{' '}
            <strong>{pendingThemeSwitch}</strong> will discard your changes unless you save them to
            a custom theme first.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end" wrap="wrap">
            <Button variant="soft" color="gray" onClick={() => setPendingThemeSwitch(null)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              color="cyan"
              onClick={() => {
                setPendingThemeSwitch(null);
                openSaveAsDialog(false);
              }}
            >
              Save As Custom Theme...
            </Button>
            <Button
              color="red"
              onClick={() => {
                if (pendingThemeSwitch) {
                  applyThemeSelection(pendingThemeSwitch);
                }
              }}
            >
              Discard Changes & Switch
            </Button>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* Save As Custom Theme Dialog */}
      <Dialog.Root open={saveAsDialogOpen} onOpenChange={setSaveAsDialogOpen}>
        <Dialog.Content maxWidth="440px">
          <Dialog.Title>Save Custom Theme</Dialog.Title>
          <Dialog.Description size="2" mb="3">
            Save your customizations as a reusable theme in the theme picker dropdown.
          </Dialog.Description>
          <form onSubmit={handleConfirmSaveAs}>
            <Box mb="4">
              <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                Theme Name
              </Text>
              <TextField.Root
                aria-label="Theme Name"
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                placeholder="Modern Editorial Custom"
                autoFocus
              />
            </Box>
            <Flex gap="3" justify="end">
              <Button
                type="button"
                variant="soft"
                color="gray"
                onClick={() => setSaveAsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" color="cyan" disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Custom Theme'}
              </Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      <UnsavedChangesDialog blocker={blocker} />
    </Box>
  );
};

export default ThemeEditor;
