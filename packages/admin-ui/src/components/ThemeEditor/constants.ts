import type { ThemeTokens, FontPreset, Swatch } from './types';

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
  maxWidth: '1920px',
  fontSizeBase: '18px',
  lineHeightBody: '1.75',
  headerLayout: 'centered',
  headerBorderStyle: 'double',
  headerTitleSize: '2rem',
  headerNavTransform: 'uppercase',
  headerPadding: '1.75rem 2rem 1.25rem 2rem',
  headerTagline: '',
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
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
  maxWidth: '1920px',
  fontSizeBase: '16px',
  lineHeightBody: '1.5',
  headerLayout: 'split',
  headerBorderStyle: 'solid',
  headerTitleSize: '1.5rem',
  headerNavTransform: 'uppercase',
  headerPadding: '1.25rem 2rem',
  headerTagline: '',
  borderRadius: '2px',
  boxShadow: '4px 6px 0 #0f172a',
};

export const BENTO_BRUTALISM_DARK_PRESET: ThemeTokens = {
  fontUrl:
    'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap',
  fontHeadline: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  fontBody: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  colorBg: '#0b0f19',
  colorText: '#f8fafc',
  colorTextMuted: '#94a3b8',
  colorAccent: '#38bdf8',
  colorSurface: '#151d2f',
  colorBorder: '#334155',
  maxWidth: '1920px',
  fontSizeBase: '16px',
  lineHeightBody: '1.5',
  headerLayout: 'split',
  headerBorderStyle: 'solid',
  headerTitleSize: '1.5rem',
  headerNavTransform: 'uppercase',
  headerPadding: '1.25rem 2rem',
  headerTagline: '',
  borderRadius: '2px',
  boxShadow: '4px 6px 0 #000000',
};

export const BUILT_IN_THEMES: Record<string, ThemeTokens> = {
  'Modern Editorial': MODERN_EDITORIAL_PRESET,
  'Bento-Brutalism': BENTO_BRUTALISM_PRESET,
  'Bento-Brutalism (Dark)': BENTO_BRUTALISM_DARK_PRESET,
};

export const CMYK_INK_SWATCHES: Swatch[] = [
  { name: 'Process Cyan (C)', hex: '#007799' },
  { name: 'Process Magenta (M)', hex: '#be185d' },
  { name: 'Process Yellow (Y)', hex: '#b45309' },
  { name: 'Registration Black (K)', hex: '#0f172a' },
];

export const FONT_PRESETS: FontPreset[] = [
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
