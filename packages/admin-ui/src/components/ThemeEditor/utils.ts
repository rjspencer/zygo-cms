import type { ThemeTokens, CustomThemeEntry } from './types';
import { MODERN_EDITORIAL_PRESET, BUILT_IN_THEMES } from './constants';

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
    a.headerTagline === b.headerTagline &&
    a.borderRadius === b.borderRadius &&
    a.boxShadow === b.boxShadow
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
    theme_border_radius: tokens.borderRadius,
    theme_box_shadow: tokens.boxShadow,
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
    borderRadius: settingsData.theme_border_radius || fallback.borderRadius,
    boxShadow: settingsData.theme_box_shadow || fallback.boxShadow,
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

export function resolveThemeTokens(
  themeName: string,
  customList: CustomThemeEntry[] = []
): ThemeTokens {
  if (BUILT_IN_THEMES[themeName]) {
    return { ...BUILT_IN_THEMES[themeName] };
  }
  const found = customList.find((c) => c.name === themeName);
  if (found) {
    return { ...found.tokens };
  }
  return { ...MODERN_EDITORIAL_PRESET };
}

export function createOrUpdateCustomTheme(
  targetName: string,
  baseThemeName: string,
  customThemes: CustomThemeEntry[],
  tokens: ThemeTokens
): { updatedCustomList: CustomThemeEntry[]; entry: CustomThemeEntry } {
  const baseTheme = BUILT_IN_THEMES[baseThemeName]
    ? baseThemeName
    : customThemes.find((t) => t.name === baseThemeName)?.baseTheme || 'Modern Editorial';

  const entry: CustomThemeEntry = {
    name: targetName,
    baseTheme,
    tokens: { ...tokens },
  };

  const updatedCustomList = customThemes.some((t) => t.name === targetName)
    ? customThemes.map((t) => (t.name === targetName ? entry : t))
    : [...customThemes, entry];

  return { updatedCustomList, entry };
}

export function getHeaderBorderBottomCss(tokens: ThemeTokens): string {
  if (tokens.headerBorderStyle === 'double') {
    return `3px double ${tokens.colorBorder}`;
  }
  if (tokens.headerBorderStyle === 'solid') {
    return `1px solid ${tokens.colorBorder}`;
  }
  return 'none';
}

export function generateThemeCss(tokens: ThemeTokens): string {
  const borderBottomCss = getHeaderBorderBottomCss(tokens);
  return `:root {
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
  --border-radius: ${tokens.borderRadius};
  --box-shadow: ${tokens.boxShadow};
}`;
}
