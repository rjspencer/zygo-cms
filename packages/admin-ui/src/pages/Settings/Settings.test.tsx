import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Title')).toBeTruthy();
      expect(screen.getByDisplayValue('https://test.example.com')).toBeTruthy();
      expect(screen.getByDisplayValue('Test Description')).toBeTruthy();
    });
  });

  it('disables save button when there are no changes, and enables when dirty', async () => {
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

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Title')).toBeTruthy();
    });

    const saveButton = screen.getByRole('button', { name: /save settings/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    const titleInput = screen.getByDisplayValue('Test Title');
    await userEvent.type(titleInput, ' Updated');

    expect(saveButton.disabled).toBe(false);
  });

  it('saves settings correctly with batch format', async () => {
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

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Title')).toBeTruthy();
    });

    const titleInput = screen.getByDisplayValue('Test Title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Title');

    const saveButton = screen.getByRole('button', { name: /save settings/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    await userEvent.click(saveButton);

    await waitFor(() => {
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
  });

  it('displays user-facing error message when saving fails', async () => {
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

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Title')).toBeTruthy();
    });

    const titleInput = screen.getByDisplayValue('Test Title');
    await userEvent.type(titleInput, ' Error Test');

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Database connection failed')).toBeTruthy();
    });
  });

  it('displays Public Site configured from VITE_PUBLIC_SITE_URL in edge environment card', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('Public Site')).toBeTruthy();
      expect(screen.getByText('https://zygodactylstudios.com')).toBeTruthy();
    });

    import.meta.env.VITE_PUBLIC_SITE_URL = '';
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

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Title')).toBeTruthy();
    });

    // Site Title
    const siteTitleInput = screen.getByLabelText('Site Title');
    expect(siteTitleInput).toBeDefined();
    expect(siteTitleInput.getAttribute('id')).toBe('settings-site-title-input');

    // Canonical Origin
    const canonicalInput = screen.getByLabelText('Canonical Origin');
    expect(canonicalInput).toBeDefined();
    expect(canonicalInput.getAttribute('id')).toBe('settings-canonical-origin-input');
    expect(canonicalInput.getAttribute('aria-describedby')).toBe('settings-canonical-origin-description');
    const canonicalDesc = document.getElementById('settings-canonical-origin-description');
    expect(canonicalDesc).toBeDefined();
    expect(canonicalDesc?.textContent).toContain('Used to generate canonical URLs');

    // Meta Description
    const metaDescriptionInput = screen.getByLabelText('Meta Description');
    expect(metaDescriptionInput).toBeDefined();
    expect(metaDescriptionInput.getAttribute('id')).toBe('settings-meta-description-input');

    // Analytics Switch
    const analyticsSwitch = screen.getByLabelText('Enable Web Analytics');
    expect(analyticsSwitch).toBeDefined();
    expect(analyticsSwitch.getAttribute('id')).toBe('settings-analytics-switch');
    expect(analyticsSwitch.getAttribute('aria-describedby')).toBe('settings-analytics-description');
    const analyticsDesc = document.getElementById('settings-analytics-description');
    expect(analyticsDesc).toBeDefined();
    expect(analyticsDesc?.textContent).toContain('Enable pageview tracking');

    // Cloudflare Web Analytics Site Tag / Token
    const analyticsSiteTagInput = screen.getByLabelText('Cloudflare Web Analytics Site Tag / Token');
    expect(analyticsSiteTagInput).toBeDefined();
    expect(analyticsSiteTagInput.getAttribute('id')).toBe('settings-analytics-site-tag');
    expect(analyticsSiteTagInput.getAttribute('aria-describedby')).toBe('settings-analytics-site-tag-desc');
    const analyticsSiteTagDesc = document.getElementById('settings-analytics-site-tag-desc');
    expect(analyticsSiteTagDesc).toBeDefined();
    expect(analyticsSiteTagDesc?.textContent).toContain('Obtained from the Cloudflare Dashboard');

    // Docs Mode Switch
    const docsSwitch = screen.getByLabelText('Enable Docs Mode');
    expect(docsSwitch).toBeDefined();
    expect(docsSwitch.getAttribute('id')).toBe('settings-docs-mode-switch');
    expect(docsSwitch.getAttribute('aria-describedby')).toBe('settings-docs-mode-description');
    const docsDesc = document.getElementById('settings-docs-mode-description');
    expect(docsDesc).toBeDefined();
    expect(docsDesc?.textContent).toContain('Enable product documentation features');

    // Docs Base Path
    const docsPathInput = screen.getByLabelText('Docs Base Path');
    expect(docsPathInput).toBeDefined();
    expect(docsPathInput.getAttribute('id')).toBe('settings-docs-path-input');
    expect(docsPathInput.getAttribute('aria-describedby')).toBe('settings-docs-path-description');
    const docsPathDesc = document.getElementById('settings-docs-path-description');
    expect(docsPathDesc).toBeDefined();
    expect(docsPathDesc?.textContent).toContain('The path where the documentation will be served');

    // Site Logo
    const siteLogoInput = screen.getByLabelText('Site Logo');
    expect(siteLogoInput).toBeDefined();
    expect(siteLogoInput.getAttribute('id')).toBe('settings-site-logo-input');
    expect(siteLogoInput.getAttribute('aria-describedby')).toBe('settings-site-logo-description');

    // Site Logo (Dark Mode)
    const siteLogoDarkInput = screen.getByLabelText('Site Logo (Dark Mode)');
    expect(siteLogoDarkInput).toBeDefined();
    expect(siteLogoDarkInput.getAttribute('id')).toBe('settings-site-logo-dark-input');
    expect(siteLogoDarkInput.getAttribute('aria-describedby')).toBe('settings-site-logo-dark-description');

    // Favicon
    const faviconInput = screen.getByLabelText('Favicon');
    expect(faviconInput).toBeDefined();
    expect(faviconInput.getAttribute('id')).toBe('settings-site-favicon-input');
    expect(faviconInput.getAttribute('aria-describedby')).toBe('settings-site-favicon-description');

    // Default OG Image
    const ogInput = screen.getByLabelText('Default Social Share Image (Open Graph)');
    expect(ogInput).toBeDefined();
    expect(ogInput.getAttribute('id')).toBe('settings-default-og-image-input');
    expect(ogInput.getAttribute('aria-describedby')).toBe('settings-default-og-image-description');

    // Footer Text
    const footerInput = screen.getByLabelText('Footer Text');
    expect(footerInput).toBeDefined();
    expect(footerInput.getAttribute('id')).toBe('settings-footer-text-input');
    expect(footerInput.getAttribute('aria-describedby')).toBe('settings-footer-text-description');
  });

  it('renders branding settings, displays previews, and clears on button click', async () => {
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

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://example.com/logo.png')).toBeTruthy();
      expect(screen.getByDisplayValue('https://example.com/logo-dark.png')).toBeTruthy();
      expect(screen.getByDisplayValue('https://example.com/favicon.ico')).toBeTruthy();
      expect(screen.getByDisplayValue('https://example.com/og.png')).toBeTruthy();
      expect(screen.getByDisplayValue('© 2026 Branded Site')).toBeTruthy();
    });

    // Check previews are rendered
    expect(screen.getByTestId('settings-logo-preview')).toBeTruthy();
    expect(screen.getByTestId('settings-logo-dark-preview')).toBeTruthy();
    expect(screen.getByTestId('settings-favicon-preview')).toBeTruthy();
    expect(screen.getByTestId('settings-default-og-preview')).toBeTruthy();

    // Click clear dark logo button
    const clearLogoDarkBtn = screen.getByTestId('settings-clear-logo-dark-button');
    await userEvent.click(clearLogoDarkBtn);

    const logoDarkInput = screen.getByTestId('settings-site-logo-dark-input') as HTMLInputElement;
    expect(logoDarkInput.value).toBe('');

    // Click clear logo button
    const clearLogoBtn = screen.getByTestId('settings-clear-logo-button');
    await userEvent.click(clearLogoBtn);

    const logoInput = screen.getByTestId('settings-site-logo-input') as HTMLInputElement;
    expect(logoInput.value).toBe('');

    // Save button should now be enabled
    const saveButton = screen.getByRole('button', { name: /save settings/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
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
    await waitFor(() => {
      expect(screen.getByDisplayValue('Copyright {{ year }} Zygo CMS')).toBeTruthy();
      expect(screen.getByTestId('settings-footer-text-preview')).toBeTruthy();
      expect(screen.getByTestId('settings-footer-text-preview').textContent).toContain(`Preview: Copyright ${currentYear} Zygo CMS`);
    });
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

    await waitFor(() => {
      const logoImg = screen.getByTestId('settings-logo-preview') as HTMLImageElement;
      expect(logoImg.src).toBe(getPublicSiteUrl('/media/1726700000000-logo.webp'));
      const faviconImg = screen.getByTestId('settings-favicon-preview') as HTMLImageElement;
      expect(faviconImg.src).toBe(getPublicSiteUrl('/media/favicon.png'));
      const ogImg = screen.getByTestId('settings-default-og-preview') as HTMLImageElement;
      expect(ogImg.src).toBe(getPublicSiteUrl('/media/social.jpg'));
    });

    // Simulate image error on logo
    const logoImg = screen.getByTestId('settings-logo-preview');
    fireEvent.error(logoImg);

    await waitFor(() => {
      expect(screen.getByText('Unable to load image preview')).toBeTruthy();
    });
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

    await waitFor(() => {
      expect(screen.getByText('Cloudflare AI Crawl Control')).toBeTruthy();
      expect(screen.getByText('Live Edge Sync')).toBeTruthy();
      const masterSwitch = screen.getByRole('switch', { name: /block ai scrapers and crawlers/i });
      expect(masterSwitch.getAttribute('aria-checked')).toBe('true');
    });
  });

  it('saves AI crawl options to Cloudflare API when overall page save button is clicked', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('Cloudflare AI Crawl Control')).toBeTruthy();
    });

    const masterSwitch = screen.getByRole('switch', { name: /block ai scrapers and crawlers/i });
    expect(masterSwitch.getAttribute('aria-checked')).toBe('false');

    await userEvent.click(masterSwitch);
    expect(masterSwitch.getAttribute('aria-checked')).toBe('true');

    const saveButton = screen.getByRole('button', { name: /save settings/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);

    await userEvent.click(saveButton);

    await waitFor(() => {
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
  });

  it('saves analytics_site_tag correctly when changed and saved', async () => {
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

    await waitFor(() => {
      expect(screen.getByDisplayValue('initial-tag-123')).toBeTruthy();
    });

    const siteTagInput = screen.getByLabelText('Cloudflare Web Analytics Site Tag / Token');
    await userEvent.clear(siteTagInput);
    await userEvent.type(siteTagInput, 'updated-tag-456');

    const saveButton = screen.getByRole('button', { name: /save settings/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    await userEvent.click(saveButton);

    await waitFor(() => {
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
});
