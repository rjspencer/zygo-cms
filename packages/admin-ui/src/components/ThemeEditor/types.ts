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
  borderRadius: string;
  boxShadow: string;
}

export interface CustomThemeEntry {
  name: string;
  baseTheme: string;
  tokens: ThemeTokens;
}

export interface ThemeEditorProps {
  themeId?: string;
  initialTokens?: Partial<ThemeTokens>;
  initialThemeName?: string;
  initialPreviewMode?: 'editorial' | 'docs';
  onSaveSuccess?: () => void;
}

export interface FontPreset {
  name: string;
  headlineFont: string;
  bodyFont: string;
  url: string;
  description: string;
}

export interface Swatch {
  name: string;
  hex: string;
}
