import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeEditor } from './ThemeEditor';
import { cleanGoogleFontUrl } from './utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
  getPublicSiteUrl: vi.fn((path?: string) => {
    if (!path) return 'https://example.com/';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `https://example.com${clean}`;
  }),
}));

import { apiFetch } from '../../utils/api';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const ThemeWithRouter = () => {
  const [router] = useState(() =>
    createMemoryRouter([{ path: '*', element: <ThemeEditor /> }])
  );
  return <RouterProvider router={router} />;
};

describe('ThemeEditor component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cleanGoogleFontUrl extracts URL from <link> tag correctly', () => {
    const rawTag =
      '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap" rel="stylesheet">';
    expect(cleanGoogleFontUrl(rawTag)).toBe(
      'https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap'
    );

    const directUrl =
      'https://fonts.googleapis.com/css2?family=Lora&display=swap';
    expect(cleanGoogleFontUrl(directUrl)).toBe(directUrl);
  });

  it('fetches existing theme settings and populates fields', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        theme_font_url: 'https://fonts.googleapis.com/css2?family=Cinzel&display=swap',
        theme_font_headline: "'Cinzel', serif",
        theme_font_body: "'Lora', serif",
        theme_color_bg: '#fcfcfc',
        theme_color_text: '#111111',
        theme_color_accent: '#b91c1c',
        theme_header_layout: 'split',
        theme_header_border_style: 'solid',
        theme_header_title_size: '2.5rem',
        theme_header_tagline: 'Custom Editorial Journal',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByDisplayValue('https://fonts.googleapis.com/css2?family=Cinzel&display=swap')
      ).toBeTruthy();
      expect(screen.getByDisplayValue("'Cinzel', serif")).toBeTruthy();
      expect(screen.getAllByDisplayValue('#b91c1c').length).toBe(2);
      expect(screen.getByDisplayValue('2.5rem')).toBeTruthy();
      expect(screen.getByDisplayValue('Custom Editorial Journal')).toBeTruthy();
    });
  });

  it('applies a curated font preset when clicked', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    // Look for preset card
    const presetCard = await screen.findByText(/Playfair Display & Source Sans/i);
    fireEvent.click(presetCard);

    expect(
      screen.getByDisplayValue("'Playfair Display', Georgia, serif")
    ).toBeTruthy();
  });

  it('allows switching header layout and updates preview dynamically', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    // Initially centered header layout is active by default in Modern Editorial
    expect(await screen.findByTestId('preview-header-centered')).toBeTruthy();

    // Click Split Bar layout option
    const splitOption = screen.getByText('Split Bar');
    fireEvent.click(splitOption);

    // The live preview should switch to the split header
    expect(screen.getByTestId('preview-header-split')).toBeTruthy();

    // Click Stacked Minimal layout option
    const stackedOption = screen.getByText('Stacked Minimal');
    fireEvent.click(stackedOption);

    // The live preview should switch to stacked header
    expect(screen.getByTestId('preview-header-stacked')).toBeTruthy();
  });

  it('allows customizing header border style and navigation lettering', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    // Click "Single Solid" border option
    const solidBorder = await screen.findByText('Single Solid');
    fireEvent.click(solidBorder);

    // Toggle navigation lettering to Normal Case
    const normalCaseBtn = screen.getByRole('button', { name: 'Normal Case' });
    fireEvent.click(normalCaseBtn);

    const saveButton = screen.getByRole('button', { name: /^Save$/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
  });

  it('saves updated theme tokens to a custom theme or switches active live theme via /api/settings', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        theme_color_accent: '#991b1b',
        theme_header_layout: 'centered',
        theme_active_name: 'Modern Editorial',
      }),
    });

    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByDisplayValue('#991b1b').length).toBe(2);
    });

    const saveButton = screen.getByRole('button', { name: /^Save$/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    // Switch to Split layout
    const splitOption = screen.getByText('Split Bar');
    fireEvent.click(splitOption);

    expect(saveButton.disabled).toBe(false);

    // Clicking Save on a modified built-in theme opens the Save As dialog prefilled with "Modern Editorial Custom"
    await user.click(saveButton);

    const nameInput = await screen.findByLabelText(/Theme Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Modern Editorial Custom');

    const confirmSaveBtn = screen.getByRole('button', { name: /Save Custom Theme/i });
    await user.click(confirmSaveBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Modern Editorial Custom'),
        })
      );
    });
  });

  it('renders simplified header with theme name, active badge, and clone button, without active switch or dropdown', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        theme_active_name: 'Modern Editorial',
        theme_primary_id: 'modern-editorial',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    // Header displays theme name as heading
    expect(await screen.findByRole('heading', { name: 'Modern Editorial' })).toBeTruthy();

    // Active badge is shown for active theme
    expect(screen.getByText('Active Primary')).toBeTruthy();

    // No switch to button or active theme indicator text
    expect(screen.queryByTestId('active-theme-indicator')).toBeNull();
    expect(screen.queryByRole('button', { name: /Switch to/i })).toBeNull();

    // No theme picker dropdown
    expect(screen.queryByRole('combobox', { name: /Theme Picker/i })).toBeNull();

    // Clone theme button is present
    expect(screen.getByRole('button', { name: /Clone Theme/i })).toBeTruthy();
  });

  it('supports inline rename for themes via pencil icon and input', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await screen.findByRole('heading', { name: 'Modern Editorial' });

    // Click rename pencil button
    const renameBtn = screen.getByRole('button', { name: /Rename theme/i });
    await user.click(renameBtn);

    // Edit input should appear
    const input = screen.getByRole('textbox', { name: /Theme name/i });
    expect(input).toBeTruthy();

    // Cancel editing
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelBtn);
    expect(screen.getByRole('heading', { name: 'Modern Editorial' })).toBeTruthy();

    // Start editing again and save
    await user.click(renameBtn);
    const inputAgain = screen.getByRole('textbox', { name: /Theme name/i });
    await user.clear(inputAgain);
    await user.type(inputAgain, 'Modern Editorial V2');

    const saveBtn = screen.getByRole('button', { name: /Save theme name/i });
    await user.click(saveBtn);

    // Header now reflects the updated name
    expect(await screen.findByRole('heading', { name: 'Modern Editorial V2' })).toBeTruthy();
  });

  it('does not render any active badge when theme is not active', async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/themes/inactive-theme') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'inactive-theme',
            name: 'Inactive Custom Theme',
            is_locked: false,
            tokens: {},
          }),
        });
      }
      if (url === '/api/settings') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            theme_primary_id: 'modern-editorial',
            theme_active_name: 'Modern Editorial',
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const queryClient = createTestQueryClient();
    const router = createMemoryRouter(
      [{ path: '*', element: <ThemeEditor themeId="inactive-theme" /> }]
    );
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <RouterProvider router={router} />
        </Theme>
      </QueryClientProvider>
    );

    await screen.findByRole('heading', { name: 'Inactive Custom Theme' });

    // Inactive theme should not render Active, Active Primary, or Active Dark badges
    expect(screen.queryByText('Active Primary')).toBeNull();
    expect(screen.queryByText('Active Dark')).toBeNull();
    expect(screen.queryByText('Active')).toBeNull();
  });

  it('toggles between Editorial / Bento and Docs Layout in the Live Preview', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    expect(await screen.findByTestId('editorial-preview-container')).toBeTruthy();

    const docsModeBtn = screen.getByRole('button', { name: /Docs Layout/i });
    await user.click(docsModeBtn);

    expect(await screen.findByTestId('preview-mode-docs')).toBeTruthy();
    expect(screen.getByText('Edge Caching & Invalidation')).toBeTruthy();
  });

  it('renders Google Fonts link and instructions', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Browse Google Fonts')).toBeTruthy();
    const googleLink = screen.getByRole('link', { name: /Open Google Fonts/i });
    expect(googleLink.getAttribute('href')).toBe('https://fonts.google.com');
    expect(screen.getByText(/How to copy fonts back to Zygo:/i)).toBeTruthy();
  });

  it('renders the Live Editorial Preview with live styled elements', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    expect(await screen.findByText('The Zygo Review')).toBeTruthy();
    expect(
      screen.getByText('The Architecture of the Modern Digital Essay')
    ).toBeTruthy();
    expect(screen.getByTestId('editorial-preview-container')).toBeTruthy();
  });

  it('programmatically associates labels with inputs and configures accessible radiogroups and button groups', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await screen.findByText('The Zygo Review');

    // 1. Color Tokens Panel
    const colorKeys = [
      'colorBg',
      'colorText',
      'colorAccent',
      'colorTextMuted',
      'colorSurface',
      'colorBorder',
    ];
    for (const key of colorKeys) {
      const label = container.querySelector(`label[for="color-input-${key}"]`);
      expect(label).toBeTruthy();
      const input = container.querySelector(`#color-input-${key}`);
      expect(input).toBeTruthy();
      expect(input?.getAttribute('aria-label')).toMatch(/hex code/);
    }

    // 2. Typography Panel
    const fontUrlLabel = container.querySelector('label[for="typography-font-url"]');
    expect(fontUrlLabel).toBeTruthy();
    const fontUrlInput = container.querySelector('#typography-font-url');
    expect(fontUrlInput).toBeTruthy();
    expect(fontUrlInput?.getAttribute('aria-describedby')).toBe('typography-font-url-desc');
    const fontUrlDesc = container.querySelector('#typography-font-url-desc');
    expect(fontUrlDesc).toBeTruthy();

    const headlineFontLabel = container.querySelector('label[for="typography-headline-font"]');
    expect(headlineFontLabel).toBeTruthy();
    const headlineFontInput = container.querySelector('#typography-headline-font');
    expect(headlineFontInput).toBeTruthy();

    const bodyFontLabel = container.querySelector('label[for="typography-body-font"]');
    expect(bodyFontLabel).toBeTruthy();
    const bodyFontInput = container.querySelector('#typography-body-font');
    expect(bodyFontInput).toBeTruthy();

    // 3. Layout Dimensions Panel
    const maxWidthLabel = container.querySelector('label[for="dimension-max-width"]');
    expect(maxWidthLabel).toBeTruthy();
    const maxWidthInput = container.querySelector('#dimension-max-width');
    expect(maxWidthInput).toBeTruthy();

    const fontSizeLabel = container.querySelector('label[for="dimension-font-size-base"]');
    expect(fontSizeLabel).toBeTruthy();
    const fontSizeInput = container.querySelector('#dimension-font-size-base');
    expect(fontSizeInput).toBeTruthy();

    const lineHeightLabel = container.querySelector('label[for="dimension-line-height-body"]');
    expect(lineHeightLabel).toBeTruthy();
    const lineHeightInput = container.querySelector('#dimension-line-height-body');
    expect(lineHeightInput).toBeTruthy();

    const borderRadiusLabel = container.querySelector('label[for="dimension-border-radius"]');
    expect(borderRadiusLabel).toBeTruthy();
    const borderRadiusInput = container.querySelector('#dimension-border-radius');
    expect(borderRadiusInput).toBeTruthy();

    const boxShadowLabel = container.querySelector('label[for="dimension-box-shadow"]');
    expect(boxShadowLabel).toBeTruthy();
    const boxShadowInput = container.querySelector('#dimension-box-shadow');
    expect(boxShadowInput).toBeTruthy();

    // 4. Header Styling Panel
    const layoutLabel = container.querySelector('#header-layout-label');
    expect(layoutLabel).toBeTruthy();
    const layoutGroup = screen.getByRole('radiogroup', { name: 'Header Layout' });
    expect(layoutGroup).toBeTruthy();
    expect(layoutGroup.getAttribute('aria-labelledby')).toBe('header-layout-label');
    const layoutRadios = layoutGroup.querySelectorAll('[role="radio"]');
    expect(layoutRadios.length).toBe(3);
    expect(layoutRadios[0].getAttribute('aria-checked')).toBe('true');

    const borderStyleLabel = container.querySelector('#header-border-style-label');
    expect(borderStyleLabel).toBeTruthy();
    const borderStyleGroup = screen.getByRole('radiogroup', { name: 'Header Border Style' });
    expect(borderStyleGroup).toBeTruthy();
    expect(borderStyleGroup.getAttribute('aria-labelledby')).toBe('header-border-style-label');
    const borderRadios = borderStyleGroup.querySelectorAll('[role="radio"]');
    expect(borderRadios.length).toBe(3);

    const titleSizeLabel = container.querySelector('label[for="header-title-size"]');
    expect(titleSizeLabel).toBeTruthy();
    const titleSizeInput = container.querySelector('#header-title-size');
    expect(titleSizeInput).toBeTruthy();

    const navTransformLabel = container.querySelector('#header-nav-transform-label');
    expect(navTransformLabel).toBeTruthy();
    const navTransformGroup = screen.getByRole('group', { name: /Navigation Lettering/i });
    expect(navTransformGroup).toBeTruthy();
    expect(navTransformGroup.getAttribute('aria-labelledby')).toBe('header-nav-transform-label');
    const uppercaseBtn = screen.getByRole('button', { name: 'UPPERCASE' });
    const normalCaseBtn = screen.getByRole('button', { name: 'Normal Case' });
    expect(uppercaseBtn.getAttribute('aria-pressed')).toBe('true');
    expect(normalCaseBtn.getAttribute('aria-pressed')).toBe('false');

    await user.click(normalCaseBtn);
    expect(uppercaseBtn.getAttribute('aria-pressed')).toBe('false');
    expect(normalCaseBtn.getAttribute('aria-pressed')).toBe('true');

    const taglineLabel = container.querySelector('label[for="header-tagline"]');
    expect(taglineLabel).toBeTruthy();
    const taglineInput = container.querySelector('#header-tagline');
    expect(taglineInput).toBeTruthy();

    const headerPaddingLabel = container.querySelector('label[for="header-padding"]');
    expect(headerPaddingLabel).toBeTruthy();
    const headerPaddingInput = container.querySelector('#header-padding');
    expect(headerPaddingInput).toBeTruthy();

    // 5. Clone Theme Button
    const cloneThemeBtn = screen.getByRole('button', { name: /Clone Theme/i });
    expect(cloneThemeBtn).toBeTruthy();
  });

  it('allows editing borderRadius and boxShadow tokens', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const queryClient = createTestQueryClient();
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('#dimension-border-radius')).toBeTruthy();
      expect(container.querySelector('#dimension-box-shadow')).toBeTruthy();
    });

    const borderRadiusInput = container.querySelector('#dimension-border-radius') as HTMLInputElement;
    const boxShadowInput = container.querySelector('#dimension-box-shadow') as HTMLInputElement;

    expect(borderRadiusInput.value).toBe('8px');
    expect(boxShadowInput.value).toBe('0 4px 6px rgba(0, 0, 0, 0.1)');

    fireEvent.change(borderRadiusInput, { target: { value: '16px' } });
    fireEvent.change(boxShadowInput, { target: { value: '0 8px 16px rgba(0,0,0,0.2)' } });

    expect(borderRadiusInput.value).toBe('16px');
    expect(boxShadowInput.value).toBe('0 8px 16px rgba(0,0,0,0.2)');
  });

  it('renders site logo and footer copyright in live preview when configured in settings', async () => {
    const currentYear = String(new Date().getFullYear());
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        site_title: 'Steph Wanicki Art',
        site_logo: 'https://example.com/logo.png',
        footer_text: '© {{ year }} Steph Wanicki Art. All rights reserved.',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const logoImg = screen.getByTestId('preview-site-logo') as HTMLImageElement;
      expect(logoImg).toBeTruthy();
      expect(logoImg.src).toBe('https://example.com/logo.png');
      expect(logoImg.alt).toBe('Steph Wanicki Art');

      const footerCopyright = screen.getByTestId('preview-footer-copyright');
      expect(footerCopyright.textContent).toBe(`© ${currentYear} Steph Wanicki Art. All rights reserved.`);
    });
  });

  it('renders dark mode site logo with picture element in live preview when configured in settings', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        site_title: 'Steph Wanicki Art',
        site_logo: 'https://example.com/logo.png',
        site_logo_dark: 'https://example.com/logo-dark.png',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const logoImg = screen.getByTestId('preview-site-logo') as HTMLImageElement;
      expect(logoImg).toBeTruthy();
      expect(logoImg.src).toBe('https://example.com/logo.png');
      const picture = logoImg.closest('picture');
      expect(picture).toBeTruthy();
      const source = picture?.querySelector('source');
      expect(source?.srcset).toBe('https://example.com/logo-dark.png');
      expect(source?.media).toBe('(prefers-color-scheme: dark)');
    });
  });
});

