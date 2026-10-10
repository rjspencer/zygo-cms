import React, { useState, useEffect } from 'react';
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
} from '@radix-ui/themes';
import {
  CheckIcon,
  InfoCircledIcon,
  ExternalLinkIcon,
  CopyIcon,
  ResetIcon,
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

export interface ThemeEditorProps {
  initialTokens?: Partial<ThemeTokens>;
  onSaveSuccess?: () => void;
}

export const ThemeEditor: React.FC<ThemeEditorProps> = ({ initialTokens, onSaveSuccess }) => {
  const queryClient = useQueryClient();

  const { data: settingsData = {}, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiFetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const [tokens, setTokens] = useState<ThemeTokens>(() => ({
    ...MODERN_EDITORIAL_PRESET,
    ...initialTokens,
  }));

  const [saved, setSaved] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with fetched settings
  useEffect(() => {
    if (settingsData && Object.keys(settingsData).length > 0) {
      setTokens({
        fontUrl: settingsData.theme_font_url || MODERN_EDITORIAL_PRESET.fontUrl,
        fontHeadline: settingsData.theme_font_headline || MODERN_EDITORIAL_PRESET.fontHeadline,
        fontBody: settingsData.theme_font_body || MODERN_EDITORIAL_PRESET.fontBody,
        colorBg: settingsData.theme_color_bg || MODERN_EDITORIAL_PRESET.colorBg,
        colorText: settingsData.theme_color_text || MODERN_EDITORIAL_PRESET.colorText,
        colorTextMuted: settingsData.theme_color_text_muted || MODERN_EDITORIAL_PRESET.colorTextMuted,
        colorAccent: settingsData.theme_color_accent || MODERN_EDITORIAL_PRESET.colorAccent,
        colorSurface: settingsData.theme_color_surface || MODERN_EDITORIAL_PRESET.colorSurface,
        colorBorder: settingsData.theme_color_border || MODERN_EDITORIAL_PRESET.colorBorder,
        maxWidth: settingsData.theme_max_width || MODERN_EDITORIAL_PRESET.maxWidth,
        fontSizeBase: settingsData.theme_font_size_base || MODERN_EDITORIAL_PRESET.fontSizeBase,
        lineHeightBody: settingsData.theme_line_height || MODERN_EDITORIAL_PRESET.lineHeightBody,
        headerLayout:
          (settingsData.theme_header_layout as ThemeTokens['headerLayout']) ||
          MODERN_EDITORIAL_PRESET.headerLayout,
        headerBorderStyle:
          (settingsData.theme_header_border_style as ThemeTokens['headerBorderStyle']) ||
          MODERN_EDITORIAL_PRESET.headerBorderStyle,
        headerTitleSize:
          settingsData.theme_header_title_size || MODERN_EDITORIAL_PRESET.headerTitleSize,
        headerNavTransform:
          (settingsData.theme_header_nav_transform as ThemeTokens['headerNavTransform']) ||
          MODERN_EDITORIAL_PRESET.headerNavTransform,
        headerPadding:
          settingsData.theme_header_padding || MODERN_EDITORIAL_PRESET.headerPadding,
        headerTagline:
          settingsData.theme_header_tagline ?? MODERN_EDITORIAL_PRESET.headerTagline,
      });
    }
  }, [settingsData]);

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

  const isDirty =
    tokens.fontUrl !== (settingsData.theme_font_url || MODERN_EDITORIAL_PRESET.fontUrl) ||
    tokens.fontHeadline !== (settingsData.theme_font_headline || MODERN_EDITORIAL_PRESET.fontHeadline) ||
    tokens.fontBody !== (settingsData.theme_font_body || MODERN_EDITORIAL_PRESET.fontBody) ||
    tokens.colorBg !== (settingsData.theme_color_bg || MODERN_EDITORIAL_PRESET.colorBg) ||
    tokens.colorText !== (settingsData.theme_color_text || MODERN_EDITORIAL_PRESET.colorText) ||
    tokens.colorTextMuted !== (settingsData.theme_color_text_muted || MODERN_EDITORIAL_PRESET.colorTextMuted) ||
    tokens.colorAccent !== (settingsData.theme_color_accent || MODERN_EDITORIAL_PRESET.colorAccent) ||
    tokens.colorSurface !== (settingsData.theme_color_surface || MODERN_EDITORIAL_PRESET.colorSurface) ||
    tokens.colorBorder !== (settingsData.theme_color_border || MODERN_EDITORIAL_PRESET.colorBorder) ||
    tokens.maxWidth !== (settingsData.theme_max_width || MODERN_EDITORIAL_PRESET.maxWidth) ||
    tokens.fontSizeBase !== (settingsData.theme_font_size_base || MODERN_EDITORIAL_PRESET.fontSizeBase) ||
    tokens.lineHeightBody !== (settingsData.theme_line_height || MODERN_EDITORIAL_PRESET.lineHeightBody) ||
    tokens.headerLayout !== (settingsData.theme_header_layout || MODERN_EDITORIAL_PRESET.headerLayout) ||
    tokens.headerBorderStyle !==
    (settingsData.theme_header_border_style || MODERN_EDITORIAL_PRESET.headerBorderStyle) ||
    tokens.headerTitleSize !==
    (settingsData.theme_header_title_size || MODERN_EDITORIAL_PRESET.headerTitleSize) ||
    tokens.headerNavTransform !==
    (settingsData.theme_header_nav_transform || MODERN_EDITORIAL_PRESET.headerNavTransform) ||
    tokens.headerPadding !==
    (settingsData.theme_header_padding || MODERN_EDITORIAL_PRESET.headerPadding) ||
    tokens.headerTagline !==
    (settingsData.theme_header_tagline ?? MODERN_EDITORIAL_PRESET.headerTagline);

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

  const handleSave = async () => {
    setError(null);
    try {
      await updateSettingsMutation.mutateAsync({
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
      });

      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaveSuccess?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to save theme settings');
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

  if (isLoading && Object.keys(settingsData).length === 0) {
    return <Box p="4">Loading theme settings...</Box>;
  }

  return (
    <Box style={{ maxWidth: '2000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Header */}
      <Flex justify="between" align="center" mb="5" wrap="wrap" gap="3">
        <Box>
          <Flex align="center" gap="2">
            <ColorWheelIcon width="24" height="24" style={{ color: 'var(--cyan-9)' }} />
            <Heading size="6" weight="bold">
              Theme Settings
            </Heading>
            <Badge color="cyan" variant="soft">
              Modern Editorial
            </Badge>
          </Flex>
          <Text size="2" color="gray" mt="1">
            Configure typography, Google Fonts, header styles, and design tokens via CSS variables
          </Text>
        </Box>
        <Flex gap="3" align="center">
          <Button variant="outline" color="gray" onClick={handleResetToModernEditorial}>
            <ResetIcon width="16" height="16" /> Reset to Modern Editorial
          </Button>
          <Button
            variant="solid"
            color="cyan"
            onClick={handleSave}
            disabled={!isDirty || updateSettingsMutation.isPending}
          >
            {saved ? (
              <>
                <CheckIcon width="18" height="18" /> Saved!
              </>
            ) : updateSettingsMutation.isPending ? (
              'Saving...'
            ) : (
              'Save Theme'
            )}
          </Button>
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
            <Text size="2" color="gray" mb="3">
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
                    desc: 'Clean 1px border',
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
            <Text size="2" color="gray" mb="3">
              Choose an editorial pairing below, or explore the Google Fonts library and copy your font details here.
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
                  <li>Copy the stylesheet URL starting with <code>https://fonts.googleapis.com/...</code> and paste into the Embed URL field below.</li>
                  <li>Copy the CSS font name (e.g., <code>&apos;Playfair Display&apos;, serif</code>) and paste it into the Headline or Body field.</li>
                </ol>
              </Text>
            </Box>

            {/* Curated Font Pairings */}
            <Box mb="4">
              <Text size="2" weight="bold" mb="2" as="div">
                Curated Editorial Pairings
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
                        {isSelected && <Badge color="cyan" size="1">Active</Badge>}
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
              <Text size="1" color="gray" mt="1">
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
            <Text size="2" color="gray" mb="3">
              Adjust color variables for your Modern Editorial theme.
            </Text>

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
                    onChange={(e) => setTokens((prev) => ({ ...prev, colorAccent: e.target.value }))}
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
                    onChange={(e) => setTokens((prev) => ({ ...prev, colorAccent: e.target.value }))}
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
                    onChange={(e) => setTokens((prev) => ({ ...prev, colorTextMuted: e.target.value }))}
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
                    onChange={(e) => setTokens((prev) => ({ ...prev, colorSurface: e.target.value }))}
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
                    onChange={(e) => setTokens((prev) => ({ ...prev, colorSurface: e.target.value }))}
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
                    onChange={(e) => setTokens((prev) => ({ ...prev, colorBorder: e.target.value }))}
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
                    onChange={(e) => setTokens((prev) => ({ ...prev, colorBorder: e.target.value }))}
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
                  onChange={(e) => setTokens((prev) => ({ ...prev, lineHeightBody: e.target.value }))}
                />
              </Box>
            </Grid>
          </Card>
        </Flex>

        {/* Right Column: Live Editorial Preview & CSS Export */}
        <Flex direction="column" gap="4">
          <Card size="2" style={{ position: 'sticky', top: '1rem' }}>
            <Flex justify="between" align="center" mb="3">
              <Heading size="3">Live Editorial Preview</Heading>
              <Badge color="green" variant="soft">
                Dynamic Preview
              </Badge>
            </Flex>

            {/* The Live Rendered Modern Editorial View */}
            <Box
              data-testid="editorial-preview-container"
              p="5"
              style={{
                backgroundColor: tokens.colorBg,
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
                  <Flex gap="4" mt="3" justify="center" wrap="wrap">
                    <span
                      style={{
                        color: tokens.colorAccent,
                        fontWeight: 600,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing: tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.8rem',
                      }}
                    >
                      Essays
                    </span>
                    <span
                      style={{
                        color: tokens.colorTextMuted,
                        fontWeight: 500,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing: tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.8rem',
                      }}
                    >
                      Archive
                    </span>
                    <span
                      style={{
                        color: tokens.colorTextMuted,
                        fontWeight: 500,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing: tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.8rem',
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
                  <Flex gap="3" align="center">
                    <span
                      style={{
                        color: tokens.colorAccent,
                        fontWeight: 600,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing: tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.8rem',
                      }}
                    >
                      Essays
                    </span>
                    <span
                      style={{
                        color: tokens.colorTextMuted,
                        fontWeight: 500,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing: tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.8rem',
                      }}
                    >
                      Archive
                    </span>
                    <span
                      style={{
                        color: tokens.colorTextMuted,
                        fontWeight: 500,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing: tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.8rem',
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
                  <Flex gap="3" mt="3">
                    <span
                      style={{
                        color: tokens.colorAccent,
                        fontWeight: 600,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing: tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.8rem',
                      }}
                    >
                      Essays
                    </span>
                    <span
                      style={{
                        color: tokens.colorTextMuted,
                        fontWeight: 500,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing: tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.8rem',
                      }}
                    >
                      Archive
                    </span>
                    <span
                      style={{
                        color: tokens.colorTextMuted,
                        fontWeight: 500,
                        textTransform: tokens.headerNavTransform,
                        letterSpacing: tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
                        fontSize: '0.8rem',
                      }}
                    >
                      About
                    </span>
                  </Flex>
                </Box>
              )}

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
                &ldquo;Typography is the invisible medium that gives voice to the unspoken rhythm of thought.&rdquo;
              </blockquote>

              {/* Body Paragraph */}
              <p style={{ margin: '0 0 1rem 0' }}>
                In an era dominated by relentless digital feeds, editorial craftsmanship demands intentional typographic rhythm.
                When thoughtful proportions, harmonious typefaces, and balanced whitespace meet, reading transforms into an immersive sensory ritual.
              </p>

              {/* Sample Card / Surface Element */}
              <Box
                p="3"
                mt="4"
                style={{
                  backgroundColor: tokens.colorSurface,
                  border: `1px solid ${tokens.colorBorder}`,
                  borderRadius: '6px',
                }}
              >
                <Text size="1" weight="bold" style={{ color: tokens.colorAccent }}>
                  FEATURED DISPATCH
                </Text>
                <Text size="2" weight="medium" as="div" mt="1" style={{ color: tokens.colorText }}>
                  Subscribe to Weekly Editorial Letters
                </Text>
                <Text size="1" style={{ color: tokens.colorTextMuted }} mt="1">
                  In-depth essays and typographic studies delivered directly to your inbox.
                </Text>
              </Box>
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

      <UnsavedChangesDialog blocker={blocker} />
    </Box>
  );
};

export default ThemeEditor;
