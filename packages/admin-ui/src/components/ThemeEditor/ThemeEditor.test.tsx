import { render, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
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

    const fontUrlInput = await screen.findByLabelText(/Google Fonts Embed URL/i);
    expect(fontUrlInput.getAttribute('value')).toBe(
      'https://fonts.googleapis.com/css2?family=Cinzel&display=swap'
    );
    expect(
      screen.getByLabelText(/Headline Font Family/i).getAttribute('value')
    ).toBe("'Cinzel', serif");
    expect(
      screen.getByLabelText(/Body Font Family/i).getAttribute('value')
    ).toBe("'Lora', serif");
    expect(
      screen.getByLabelText(/Accent hex code/i).getAttribute('value')
    ).toBe('#b91c1c');
    expect(
      screen.getByLabelText(/Masthead Title Size/i).getAttribute('value')
    ).toBe('2.5rem');
    expect(
      screen.getByLabelText(/Editorial Tagline/i).getAttribute('value')
    ).toBe('Custom Editorial Journal');
  });

  it('applies a curated font preset when clicked', async () => {
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

    // Look for preset card
    const presetCard = await screen.findByText(/Playfair Display & Source Sans/i);
    await user.click(presetCard);

    const headlineInput = screen.getByLabelText(/Headline Font Family/i);
    expect(headlineInput.getAttribute('value')).toBe(
      "'Playfair Display', Georgia, serif"
    );
    const bodyInput = screen.getByLabelText(/Body Font Family/i);
    expect(bodyInput.getAttribute('value')).toBe(
      "'Source Sans 3', -apple-system, sans-serif"
    );
  });

  it('allows switching header layout and updates preview dynamically', async () => {
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

    // Initially centered header layout is active by default in Modern Editorial
    const centeredPreview = await screen.findByTestId('preview-header-centered');
    expect(centeredPreview.getAttribute('data-testid')).toBe('preview-header-centered');

    // Click Split Bar layout option
    const splitOption = screen.getByRole('radio', { name: /Split Bar/i });
    await user.click(splitOption);

    // The live preview should switch to the split header
    const splitPreview = screen.getByTestId('preview-header-split');
    expect(splitPreview.getAttribute('data-testid')).toBe('preview-header-split');
    expect(screen.queryByTestId('preview-header-centered')).toBeNull();

    // Click Stacked Minimal layout option
    const stackedOption = screen.getByRole('radio', { name: /Stacked Minimal/i });
    await user.click(stackedOption);

    // The live preview should switch to stacked header
    const stackedPreview = screen.getByTestId('preview-header-stacked');
    expect(stackedPreview.getAttribute('data-testid')).toBe('preview-header-stacked');
    expect(screen.queryByTestId('preview-header-split')).toBeNull();
  });

  it('allows customizing header border style and navigation lettering', async () => {
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

    // Click "Single Solid" border option
    const solidBorder = await screen.findByRole('radio', { name: /Single Solid/i });
    await user.click(solidBorder);
    expect(solidBorder.getAttribute('aria-checked')).toBe('true');

    // Toggle navigation lettering to Normal Case
    const normalCaseBtn = screen.getByRole('button', { name: 'Normal Case' });
    await user.click(normalCaseBtn);
    expect(normalCaseBtn.getAttribute('aria-pressed')).toBe('true');

    const saveButton = screen.getByRole('button', { name: /^Save$/i });
    expect(saveButton.hasAttribute('disabled')).toBe(false);
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

    const accentInput = await screen.findByLabelText(/Accent hex code/i);
    expect(accentInput.getAttribute('value')).toBe('#991b1b');

    const saveButton = screen.getByRole('button', { name: /^Save$/i });
    expect(saveButton.hasAttribute('disabled')).toBe(true);

    // Switch to Split layout
    const splitOption = screen.getByRole('radio', { name: /Split Bar/i });
    await user.click(splitOption);

    expect(saveButton.hasAttribute('disabled')).toBe(false);

    // Clicking Save on a modified built-in theme opens the Save As dialog prefilled with "Modern Editorial Custom"
    await user.click(saveButton);

    const nameInput = await screen.findByLabelText(/Theme Name/i);
    expect(nameInput.getAttribute('value')).toBe('Modern Editorial Custom');

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

    const dialog = screen.queryByRole('dialog');
    if (dialog) {
      await waitForElementToBeRemoved(dialog);
    }
    expect(screen.queryByRole('dialog')).toBeNull();
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
    const heading = await screen.findByRole('heading', { name: 'Modern Editorial' });
    expect(heading.textContent).toBe('Modern Editorial');

    // Active badge is shown for active theme
    const activeBadge = screen.getByText('Active Primary');
    expect(activeBadge.textContent).toBe('Active Primary');

    // No switch to button or active theme indicator text
    expect(screen.queryByTestId('active-theme-indicator')).toBeNull();
    expect(screen.queryByRole('button', { name: /Switch to/i })).toBeNull();

    // No theme picker dropdown
    expect(screen.queryByRole('combobox', { name: /Theme Picker/i })).toBeNull();

    // Clone theme button is present
    const cloneBtn = screen.getByRole('button', { name: /Clone Theme/i });
    expect(cloneBtn.hasAttribute('disabled')).toBe(false);
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
    expect(input.getAttribute('value')).toBe('Modern Editorial');

    // Cancel editing
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelBtn);
    expect(screen.getByRole('heading', { name: 'Modern Editorial' }).textContent).toBe(
      'Modern Editorial'
    );

    // Start editing again and save
    await user.click(renameBtn);
    const inputAgain = screen.getByRole('textbox', { name: /Theme name/i });
    await user.clear(inputAgain);
    await user.type(inputAgain, 'Modern Editorial V2');

    const saveBtn = screen.getByRole('button', { name: /Save theme name/i });
    await user.click(saveBtn);

    // Header now reflects the updated name
    const updatedHeading = await screen.findByRole('heading', { name: 'Modern Editorial V2' });
    expect(updatedHeading.textContent).toBe('Modern Editorial V2');
    expect(screen.queryByRole('textbox', { name: /Theme name/i })).toBeNull();
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

    const heading = await screen.findByRole('heading', { name: 'Inactive Custom Theme' });
    expect(heading.textContent).toBe('Inactive Custom Theme');
    const headerRow = heading.parentElement?.parentElement as HTMLElement;

    // Inactive theme should not render Active, Active Primary, or Active Dark badges in the header
    expect(within(headerRow).queryByText('Active Primary')).toBeNull();
    expect(within(headerRow).queryByText('Active Dark')).toBeNull();
    expect(within(headerRow).queryByText('Active')).toBeNull();
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

    const editorialContainer = await screen.findByTestId('editorial-preview-container');
    expect(editorialContainer.tagName.toLowerCase()).toBe('div');

    const docsModeBtn = screen.getByRole('button', { name: /Docs Layout/i });
    await user.click(docsModeBtn);

    const docsPreview = await screen.findByTestId('preview-mode-docs');
    expect(docsPreview.tagName.toLowerCase()).toBe('div');
    expect(screen.getByRole('heading', { name: 'Edge Caching & Invalidation' }).textContent).toBe(
      'Edge Caching & Invalidation'
    );
    expect(screen.queryByTestId('preview-mode-editorial')).toBeNull();
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

    const browseHeading = await screen.findByText('Browse Google Fonts');
    expect(browseHeading.textContent).toBe('Browse Google Fonts');
    const googleLink = screen.getByRole('link', { name: /Open Google Fonts/i });
    expect(googleLink.getAttribute('href')).toBe('https://fonts.google.com');
    expect(googleLink.getAttribute('target')).toBe('_blank');
    expect(screen.getByText(/How to copy fonts back to Zygo:/i).textContent).toContain(
      'How to copy fonts back to Zygo:'
    );
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

    const siteTitle = await screen.findByText('The Zygo Review');
    expect(siteTitle.textContent).toBe('The Zygo Review');
    const articleTitle = screen.getByRole('heading', {
      name: 'The Architecture of the Modern Digital Essay',
    });
    expect(articleTitle.textContent).toBe('The Architecture of the Modern Digital Essay');
    const previewContainer = screen.getByTestId('editorial-preview-container');
    expect(previewContainer.tagName.toLowerCase()).toBe('div');
  });

  it('programmatically associates labels with inputs and configures accessible radiogroups and button groups', async () => {
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

    await screen.findByText('The Zygo Review');

    // 1. Color Tokens Panel
    const colorFields = [
      { name: /^Background hex code$/i, id: 'color-input-colorBg' },
      { name: /^Text hex code$/i, id: 'color-input-colorText' },
      { name: /^Accent hex code$/i, id: 'color-input-colorAccent' },
      { name: /^Muted Text hex code$/i, id: 'color-input-colorTextMuted' },
      { name: /^Surface \/ Card hex code$/i, id: 'color-input-colorSurface' },
      { name: /^Border hex code$/i, id: 'color-input-colorBorder' },
    ];
    for (const field of colorFields) {
      const input = screen.getByLabelText(field.name);
      expect(input.getAttribute('id')).toBe(field.id);
      expect(input.getAttribute('aria-label')).toMatch(/hex code/);
    }

    // 2. Typography Panel
    const fontUrlInput = screen.getByLabelText(/Google Fonts Embed URL/i);
    expect(fontUrlInput.getAttribute('id')).toBe('typography-font-url');
    expect(fontUrlInput.getAttribute('aria-describedby')).toBe('typography-font-url-desc');
    expect(screen.getByText(/Accepts either the direct URL/i).getAttribute('id')).toBe(
      'typography-font-url-desc'
    );

    const headlineFontInput = screen.getByLabelText(/Headline Font Family/i);
    expect(headlineFontInput.getAttribute('id')).toBe('typography-headline-font');

    const bodyFontInput = screen.getByLabelText(/Body Font Family/i);
    expect(bodyFontInput.getAttribute('id')).toBe('typography-body-font');

    // 3. Layout Dimensions Panel
    const maxWidthInput = screen.getByLabelText(/Max Width/i);
    expect(maxWidthInput.getAttribute('id')).toBe('dimension-max-width');

    const fontSizeInput = screen.getByLabelText(/Base Font Size/i);
    expect(fontSizeInput.getAttribute('id')).toBe('dimension-font-size-base');

    const lineHeightInput = screen.getByLabelText(/Line Height/i);
    expect(lineHeightInput.getAttribute('id')).toBe('dimension-line-height-body');

    const borderRadiusInput = screen.getByLabelText(/Border Radius/i);
    expect(borderRadiusInput.getAttribute('id')).toBe('dimension-border-radius');

    const boxShadowInput = screen.getByLabelText(/Box Shadow/i);
    expect(boxShadowInput.getAttribute('id')).toBe('dimension-box-shadow');

    // 4. Header Styling Panel
    const layoutGroup = screen.getByRole('radiogroup', { name: 'Header Layout' });
    expect(layoutGroup.getAttribute('aria-labelledby')).toBe('header-layout-label');
    const layoutRadios = screen.getAllByRole('radio', { name: /(Centered|Split|Stacked)/i });
    expect(layoutRadios.length).toBe(3);
    expect(layoutRadios[0].getAttribute('aria-checked')).toBe('true');

    const borderStyleGroup = screen.getByRole('radiogroup', { name: 'Header Border Style' });
    expect(borderStyleGroup.getAttribute('aria-labelledby')).toBe('header-border-style-label');
    const borderRadios = screen.getAllByRole('radio', { name: /(Double|Single|None)/i });
    expect(borderRadios.length).toBe(3);

    const titleSizeInput = screen.getByLabelText(/Masthead Title Size/i);
    expect(titleSizeInput.getAttribute('id')).toBe('header-title-size');

    const navTransformGroup = screen.getByRole('group', { name: /Navigation Lettering/i });
    expect(navTransformGroup.getAttribute('aria-labelledby')).toBe('header-nav-transform-label');
    const uppercaseBtn = screen.getByRole('button', { name: 'UPPERCASE' });
    const normalCaseBtn = screen.getByRole('button', { name: 'Normal Case' });
    expect(uppercaseBtn.getAttribute('aria-pressed')).toBe('true');
    expect(normalCaseBtn.getAttribute('aria-pressed')).toBe('false');

    await user.click(normalCaseBtn);
    expect(uppercaseBtn.getAttribute('aria-pressed')).toBe('false');
    expect(normalCaseBtn.getAttribute('aria-pressed')).toBe('true');

    const taglineInput = screen.getByLabelText(/Editorial Tagline/i);
    expect(taglineInput.getAttribute('id')).toBe('header-tagline');

    const headerPaddingInput = screen.getByLabelText(/Header Padding/i);
    expect(headerPaddingInput.getAttribute('id')).toBe('header-padding');

    // 5. Clone Theme Button
    const cloneThemeBtn = screen.getByRole('button', { name: /Clone Theme/i });
    expect(cloneThemeBtn.hasAttribute('disabled')).toBe(false);
  });

  it('allows editing borderRadius and boxShadow tokens', async () => {
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

    const borderRadiusInput = await screen.findByLabelText(/Border Radius/i);
    const boxShadowInput = screen.getByLabelText(/Box Shadow/i);

    expect(borderRadiusInput.getAttribute('value')).toBe('8px');
    expect(boxShadowInput.getAttribute('value')).toBe('0 4px 6px rgba(0, 0, 0, 0.1)');

    await user.clear(borderRadiusInput);
    await user.type(borderRadiusInput, '16px');

    await user.clear(boxShadowInput);
    await user.type(boxShadowInput, '0 8px 16px rgba(0,0,0,0.2)');

    expect(borderRadiusInput.getAttribute('value')).toBe('16px');
    expect(boxShadowInput.getAttribute('value')).toBe('0 8px 16px rgba(0,0,0,0.2)');
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

    const logoImg = (await screen.findByTestId('preview-site-logo')) as HTMLImageElement;
    expect(logoImg.getAttribute('src')).toBe('https://example.com/logo.png');
    expect(logoImg.getAttribute('alt')).toBe('Steph Wanicki Art');

    const footerCopyright = screen.getByTestId('preview-footer-copyright');
    expect(footerCopyright.textContent).toBe(`© ${currentYear} Steph Wanicki Art. All rights reserved.`);
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

    const logoImg = (await screen.findByTestId('preview-site-logo')) as HTMLImageElement;
    expect(logoImg.getAttribute('src')).toBe('https://example.com/logo.png');

    const picture = logoImg.closest('picture');
    expect(picture?.tagName.toLowerCase()).toBe('picture');

    const source = picture?.querySelector('source');
    expect(source?.getAttribute('srcset')).toBe('https://example.com/logo-dark.png');
    expect(source?.getAttribute('media')).toBe('(prefers-color-scheme: dark)');
  });
});
