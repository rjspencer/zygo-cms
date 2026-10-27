import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Settings } from './Settings';
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

import { apiFetch, getPublicSiteUrl } from '../../utils/api';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const SettingsWithRouter = () => {
  const [router] = useState(() =>
    createMemoryRouter([{ path: '*', element: <Settings /> }])
  );
  return <RouterProvider router={router} />;
};

describe('Settings component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockImplementation(async (url: string) => {
      if (url.includes('/api/cloudflare/ai-crawl')) {
        return {
          ok: true,
          json: async () => ({
            configured: false,
            message: 'Unconfigured',
            ai_bots_protection: 'disabled',
            ai_search: 'disabled',
            ai_training: 'disabled',
            ai_user: 'disabled',
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          site_title: 'Test Title',
          canonical_origin: 'https://test.example.com',
          description: 'Test Description',
          analytics_enabled: 'false',
          docs_mode_enabled: 'false',
          docs_path: '/docs',
        }),
      };
    });
  });

  it('fetches settings and displays them', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        site_title: 'Test Title',
        canonical_origin: 'https://test.example.com',
        description: 'Test Description',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    const siteTitleInput = (await screen.findByDisplayValue('Test Title')) as HTMLInputElement;
    expect(siteTitleInput.value).toBe('Test Title');
    expect(((screen.getByLabelText('Canonical Origin')) as HTMLInputElement).value).toBe('https://test.example.com');
    expect(((screen.getByLabelText('Meta Description')) as HTMLTextAreaElement).value).toBe('Test Description');
  });

  it('disables save button when there are no changes, and enables when dirty', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        site_title: 'Test Title',
        canonical_origin: 'https://test.example.com',
        description: 'Test Description',
        analytics_enabled: 'false',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    const titleInput = (await screen.findByDisplayValue('Test Title')) as HTMLInputElement;
    expect(titleInput.value).toBe('Test Title');

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    expect(saveButton.hasAttribute('disabled')).toBe(true);

    await user.type(titleInput, ' Updated');

    expect(saveButton.hasAttribute('disabled')).toBe(false);
    expect(titleInput.value).toBe('Test Title Updated');
  });

  it('saves settings correctly with batch format', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        site_title: 'Test Title',
        canonical_origin: 'https://test.example.com',
        description: 'Test Description',
        analytics_enabled: 'false',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    const titleInput = (await screen.findByDisplayValue('Test Title')) as HTMLInputElement;
    expect(titleInput.value).toBe('Test Title');

    await user.clear(titleInput);
    await user.type(titleInput, 'New Title');

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    expect(saveButton.hasAttribute('disabled')).toBe(false);
    await user.click(saveButton);

    await screen.findByRole('button', { name: /saved!/i });

    expect(apiFetch).toHaveBeenCalledWith('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: {
          site_title: 'New Title',
          canonical_origin: 'https://test.example.com',
          description: 'Test Description',
          analytics_enabled: 'false',
          analytics_site_tag: '',
          docs_mode_enabled: 'false',
          docs_path: '/docs',
          site_logo: '',
          site_logo_dark: '',
          site_favicon: '',
          default_og_image: '',
          footer_text: '',
        },
      }),
    });
  });

  it('displays user-facing error message when saving fails', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    (apiFetch as any).mockImplementation(async (url: string, options?: any) => {
      if (options?.method === 'POST') {
        return {
          ok: false,
          json: async () => ({
            error: 'Database connection failed',
          }),
        };
      }
      if (url.includes('/api/cloudflare/ai-crawl')) {
        return {
          ok: true,
          json: async () => ({ configured: false }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          site_title: 'Test Title',
          canonical_origin: 'https://test.example.com',
          description: 'Test Description',
        }),
      };
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    const titleInput = (await screen.findByDisplayValue('Test Title')) as HTMLInputElement;
    await user.type(titleInput, ' Error Test');

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    await user.click(saveButton);

    const errorCallout = await screen.findByText('Database connection failed');
    expect(errorCallout.textContent).toBe('Database connection failed');

    consoleErrorSpy.mockRestore();
  });

  it('displays Public Site configured from VITE_PUBLIC_SITE_URL in edge environment card', async () => {
    const originalSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL;
    try {
      import.meta.env.VITE_PUBLIC_SITE_URL = 'https://zygodactylstudios.com';
      (apiFetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_title: 'Test Title',
        }),
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <Theme>
            <SettingsWithRouter />
          </Theme>
        </QueryClientProvider>
      );

      const heading = await screen.findByText('Public Site');
      expect(heading.textContent).toBe('Public Site');
      expect(screen.getByText('https://zygodactylstudios.com').textContent).toBe('https://zygodactylstudios.com');
    } finally {
      import.meta.env.VITE_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it('associates form labels with inputs and configures aria-describedby for accessibility', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        site_title: 'Test Title',
        canonical_origin: 'https://test.example.com',
        description: 'Test Description',
        analytics_enabled: 'false',
        docs_mode_enabled: 'true',
        docs_path: '/docs',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    // Site Title
    const siteTitleInput = await screen.findByLabelText('Site Title');
    expect(siteTitleInput.getAttribute('id')).toBe('settings-site-title-input');

    // Canonical Origin
    const canonicalInput = screen.getByLabelText('Canonical Origin');
    expect(canonicalInput.getAttribute('id')).toBe('settings-canonical-origin-input');
    expect(canonicalInput.getAttribute('aria-describedby')).toBe('settings-canonical-origin-description');
    const canonicalDesc = document.getElementById('settings-canonical-origin-description');
    expect(canonicalDesc?.textContent).toContain('Used to generate canonical URLs');

    // Meta Description
    const metaDescriptionInput = screen.getByLabelText('Meta Description');
    expect(metaDescriptionInput.getAttribute('id')).toBe('settings-meta-description-input');

    // Analytics Switch
    const analyticsSwitch = screen.getByLabelText('Enable Web Analytics');
    expect(analyticsSwitch.getAttribute('id')).toBe('settings-analytics-switch');
    expect(analyticsSwitch.getAttribute('aria-describedby')).toBe('settings-analytics-description');
    const analyticsDesc = document.getElementById('settings-analytics-description');
    expect(analyticsDesc?.textContent).toContain('Enable pageview tracking');

    // Cloudflare Web Analytics Site Tag / Token
    const analyticsSiteTagInput = screen.getByLabelText('Cloudflare Web Analytics Site Tag / Token');
    expect(analyticsSiteTagInput.getAttribute('id')).toBe('settings-analytics-site-tag');
    expect(analyticsSiteTagInput.getAttribute('aria-describedby')).toBe('settings-analytics-site-tag-desc');
    const analyticsSiteTagDesc = document.getElementById('settings-analytics-site-tag-desc');
    expect(analyticsSiteTagDesc?.textContent).toContain('Obtained from the Cloudflare Dashboard');

    // Docs Mode Switch
    const docsSwitch = screen.getByLabelText('Enable Docs Mode');
    expect(docsSwitch.getAttribute('id')).toBe('settings-docs-mode-switch');
    expect(docsSwitch.getAttribute('aria-describedby')).toBe('settings-docs-mode-description');
    const docsDesc = document.getElementById('settings-docs-mode-description');
    expect(docsDesc?.textContent).toContain('Enable product documentation features');

    // Docs Base Path
    const docsPathInput = screen.getByLabelText('Docs Base Path');
    expect(docsPathInput.getAttribute('id')).toBe('settings-docs-path-input');
    expect(docsPathInput.getAttribute('aria-describedby')).toBe('settings-docs-path-description');
    const docsPathDesc = document.getElementById('settings-docs-path-description');
    expect(docsPathDesc?.textContent).toContain('The path where the documentation will be served');

    // Site Logo
    const siteLogoInput = screen.getByLabelText('Site Logo');
    expect(siteLogoInput.getAttribute('id')).toBe('settings-site-logo-input');
    expect(siteLogoInput.getAttribute('aria-describedby')).toBe('settings-site-logo-description');

    // Site Logo (Dark Mode)
    const siteLogoDarkInput = screen.getByLabelText('Site Logo (Dark Mode)');
    expect(siteLogoDarkInput.getAttribute('id')).toBe('settings-site-logo-dark-input');
    expect(siteLogoDarkInput.getAttribute('aria-describedby')).toBe('settings-site-logo-dark-description');

    // Favicon
    const faviconInput = screen.getByLabelText('Favicon');
    expect(faviconInput.getAttribute('id')).toBe('settings-site-favicon-input');
    expect(faviconInput.getAttribute('aria-describedby')).toBe('settings-site-favicon-description');

    // Default OG Image
    const ogInput = screen.getByLabelText('Default Social Share Image (Open Graph)');
    expect(ogInput.getAttribute('id')).toBe('settings-default-og-image-input');
    expect(ogInput.getAttribute('aria-describedby')).toBe('settings-default-og-image-description');

    // Footer Text
    const footerInput = screen.getByLabelText('Footer Text');
    expect(footerInput.getAttribute('id')).toBe('settings-footer-text-input');
    expect(footerInput.getAttribute('aria-describedby')).toBe('settings-footer-text-description');
  });

  it('renders branding settings, displays previews, and clears on button click', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        site_title: 'Branded Site',
        canonical_origin: 'https://branded.example.com',
        description: 'Branded Description',
        site_logo: 'https://example.com/logo.png',
        site_logo_dark: 'https://example.com/logo-dark.png',
        site_favicon: 'https://example.com/favicon.ico',
        default_og_image: 'https://example.com/og.png',
        footer_text: '© 2026 Branded Site',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    const logoInput = (await screen.findByDisplayValue('https://example.com/logo.png')) as HTMLInputElement;
    expect(logoInput.value).toBe('https://example.com/logo.png');
    expect(((screen.getByLabelText('Site Logo (Dark Mode)')) as HTMLInputElement).value).toBe(
      'https://example.com/logo-dark.png'
    );
    expect(((screen.getByLabelText('Favicon')) as HTMLInputElement).value).toBe(
      'https://example.com/favicon.ico'
    );
    expect(
      ((screen.getByLabelText('Default Social Share Image (Open Graph)')) as HTMLInputElement).value
    ).toBe('https://example.com/og.png');
    expect(((screen.getByLabelText('Footer Text')) as HTMLInputElement).value).toBe(
      '© 2026 Branded Site'
    );

    // Check previews have correct src
    const logoPreview = screen.getByAltText('Logo preview') as HTMLImageElement;
    expect(logoPreview.src).toBe('https://example.com/logo.png');
    const logoDarkPreview = screen.getByAltText('Dark mode logo preview') as HTMLImageElement;
    expect(logoDarkPreview.src).toBe('https://example.com/logo-dark.png');
    const faviconPreview = screen.getByAltText('Favicon preview') as HTMLImageElement;
    expect(faviconPreview.src).toBe('https://example.com/favicon.ico');
    const ogPreview = screen.getByAltText('Social share preview') as HTMLImageElement;
    expect(ogPreview.src).toBe('https://example.com/og.png');

    // Click clear dark logo button
    const clearLogoDarkBtn = screen.getByRole('button', { name: 'Clear dark mode logo' });
    await user.click(clearLogoDarkBtn);

    const logoDarkInput = screen.getByLabelText('Site Logo (Dark Mode)') as HTMLInputElement;
    expect(logoDarkInput.value).toBe('');

    // Click clear logo button
    const clearLogoBtn = screen.getByRole('button', { name: 'Clear site logo' });
    await user.click(clearLogoBtn);

    expect(logoInput.value).toBe('');

    // Save button should now be enabled
    const saveButton = screen.getByRole('button', { name: /save settings/i });
    expect(saveButton.hasAttribute('disabled')).toBe(false);
  });

  it('renders footer dynamic year preview when {{ year }} template tag is entered', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        site_title: 'Branded Site',
        canonical_origin: 'https://branded.example.com',
        description: 'Branded Description',
        footer_text: 'Copyright {{ year }} Zygo CMS',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    const currentYear = String(new Date().getFullYear());
    const footerInput = (await screen.findByDisplayValue('Copyright {{ year }} Zygo CMS')) as HTMLTextAreaElement;
    expect(footerInput.value).toBe('Copyright {{ year }} Zygo CMS');

    const preview = screen.getByText(`Preview: Copyright ${currentYear} Zygo CMS`);
    expect(preview.textContent).toContain(`Preview: Copyright ${currentYear} Zygo CMS`);
  });

  it('resolves relative /media/ URLs using getPublicSiteUrl and handles load errors gracefully', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        site_title: 'Steph Wanicki Art',
        canonical_origin: 'https://stephwanickiart.com',
        description: 'Art gallery and store',
        site_logo: '/media/1726700000000-logo.webp',
        site_favicon: '/media/favicon.png',
        default_og_image: '/media/social.jpg',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    const logoImg = (await screen.findByAltText('Logo preview')) as HTMLImageElement;
    expect(logoImg.src).toBe(getPublicSiteUrl('/media/1726700000000-logo.webp'));
    const faviconImg = screen.getByAltText('Favicon preview') as HTMLImageElement;
    expect(faviconImg.src).toBe(getPublicSiteUrl('/media/favicon.png'));
    const ogImg = screen.getByAltText('Social share preview') as HTMLImageElement;
    expect(ogImg.src).toBe(getPublicSiteUrl('/media/social.jpg'));

    // Simulate image error on logo
    fireEvent.error(logoImg);

    const errorText = await screen.findByText('Unable to load image preview');
    expect(errorText.textContent).toBe('Unable to load image preview');
    expect(screen.queryByAltText('Logo preview')).toBeNull();
  });

  it('pulls current values from Cloudflare API and renders them in AiCrawlSettingsCard', async () => {
    (apiFetch as any).mockImplementation(async (url: string) => {
      if (url.includes('/api/cloudflare/ai-crawl')) {
        return {
          ok: true,
          json: async () => ({
            configured: true,
            ai_bots_protection: 'block',
            ai_search: 'disabled',
            ai_training: 'disallow',
            ai_user: 'block',
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          site_title: 'Test Title',
          canonical_origin: 'https://test.example.com',
          description: 'Test Description',
        }),
      };
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    const heading = await screen.findByRole('heading', { name: 'Cloudflare AI Crawl Control' });
    expect(heading.textContent).toBe('Cloudflare AI Crawl Control');
    expect(screen.getByText('Live Edge Sync').textContent).toBe('Live Edge Sync');
    const masterSwitch = screen.getByRole('switch', { name: /block ai scrapers and crawlers/i });
    expect(masterSwitch.getAttribute('aria-checked')).toBe('true');
  });

  it('saves AI crawl options to Cloudflare API when overall page save button is clicked', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockImplementation(async (url: string, options?: any) => {
      if (url.includes('/api/cloudflare/ai-crawl')) {
        if (options?.method === 'PUT') {
          return { ok: true, json: async () => ({ success: true }) };
        }
        return {
          ok: true,
          json: async () => ({
            configured: true,
            ai_bots_protection: 'disabled',
            ai_search: 'disabled',
            ai_training: 'disabled',
            ai_user: 'disabled',
          }),
        };
      }
      if (options?.method === 'POST') {
        return { ok: true, json: async () => ({ success: true }) };
      }
      return {
        ok: true,
        json: async () => ({
          site_title: 'Test Title',
          canonical_origin: 'https://test.example.com',
          description: 'Test Description',
        }),
      };
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    const masterSwitch = await screen.findByRole('switch', { name: /block ai scrapers and crawlers/i });
    expect(masterSwitch.getAttribute('aria-checked')).toBe('false');

    await user.click(masterSwitch);
    expect(masterSwitch.getAttribute('aria-checked')).toBe('true');

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    expect(saveButton.hasAttribute('disabled')).toBe(false);

    await user.click(saveButton);

    await screen.findByRole('button', { name: /saved!/i });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/cloudflare/ai-crawl',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          ai_bots_protection: 'block',
          ai_search: 'disabled',
          ai_training: 'disabled',
          ai_user: 'disabled',
        }),
      })
    );
  });

  it('saves analytics_site_tag correctly when changed and saved', async () => {
    const user = userEvent.setup();
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        site_title: 'Test Title',
        canonical_origin: 'https://test.example.com',
        description: 'Test Description',
        analytics_enabled: 'true',
        analytics_site_tag: 'initial-tag-123',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SettingsWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    const siteTagInput = (await screen.findByDisplayValue('initial-tag-123')) as HTMLInputElement;
    expect(siteTagInput.value).toBe('initial-tag-123');

    await user.clear(siteTagInput);
    await user.type(siteTagInput, 'updated-tag-456');
    expect(siteTagInput.value).toBe('updated-tag-456');

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    expect(saveButton.hasAttribute('disabled')).toBe(false);
    await user.click(saveButton);

    await screen.findByRole('button', { name: /saved!/i });

    expect(apiFetch).toHaveBeenCalledWith('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: {
          site_title: 'Test Title',
          canonical_origin: 'https://test.example.com',
          description: 'Test Description',
          analytics_enabled: 'true',
          analytics_site_tag: 'updated-tag-456',
          docs_mode_enabled: 'false',
          docs_path: '/docs',
          site_logo: '',
          site_logo_dark: '',
          site_favicon: '',
          default_og_image: '',
          footer_text: '',
        },
      }),
    });
  });
});
