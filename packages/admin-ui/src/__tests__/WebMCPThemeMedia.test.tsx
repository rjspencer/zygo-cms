import '../test/setup';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { server } from '../test/mocks/server';
import * as apiModule from '../utils/api';
import { WebMCPRegistry } from '../lib/webmcp/registry';
import { WebMCPProvider } from '../providers/WebMCPProvider';
import {
  createGlobalThemeMediaMenuTools,
  useThemeEditorWebMCP,
  DEFAULT_THEME_SETTINGS,
  DEFAULT_THEME_TOKENS,
} from '../lib/webmcp/themeAndMediaTools';
import { useNavigationEditorWebMCP } from '../lib/webmcp/navigationTools';
import { ThemeEditor, MODERN_EDITORIAL_PRESET } from '../components/ThemeEditor';

describe('WebMCP Theme, Media & Navigation Menu Tools', () => {
  let registry: WebMCPRegistry;

  beforeEach(() => {
    vi.restoreAllMocks();
    registry = new WebMCPRegistry();
    registry.registerTools(createGlobalThemeMediaMenuTools());
  });

  describe('Theme Settings Tools', () => {
    it('get_theme_settings returns current theme settings from /api/settings', async () => {
      server.use(
        http.get('*/api/settings', () => {
          return HttpResponse.json({
            site_title: 'Zygo Test Site',
            theme_color_accent: '#ff0055',
            theme_font_headline: 'Playfair Display',
          });
        })
      );

      const result = await registry.callTool('get_theme_settings');
      expect(result.isError).toBeFalsy();
      expect(result.toolResult).toMatchObject({
        site_title: 'Zygo Test Site',
        theme_color_accent: '#ff0055',
        theme_font_headline: 'Playfair Display',
      });
      expect(result.content[0].text).toContain('#ff0055');
    });

    it('get_theme_settings handles API error properly', async () => {
      server.use(
        http.get('*/api/settings', () => {
          return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
        })
      );

      const result = await registry.callTool('get_theme_settings');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to fetch theme settings');
    });

    it('get_settings and update_settings handle branding settings properly', async () => {
      server.use(
        http.get('*/api/settings', () => {
          return HttpResponse.json({
            site_title: 'Branded Site',
            site_logo: 'https://example.com/logo.png',
            site_logo_dark: 'https://example.com/logo-dark.png',
            site_favicon: 'https://example.com/favicon.ico',
            default_og_image: 'https://example.com/og.png',
            footer_text: '© 2026 Branded Site',
          });
        })
      );

      const getResult = await registry.callTool('get_settings');
      expect(getResult.isError).toBeFalsy();
      expect(getResult.toolResult).toMatchObject({
        site_title: 'Branded Site',
        site_logo: 'https://example.com/logo.png',
        site_logo_dark: 'https://example.com/logo-dark.png',
        site_favicon: 'https://example.com/favicon.ico',
        default_og_image: 'https://example.com/og.png',
        footer_text: '© 2026 Branded Site',
      });

      let receivedPayload: any = null;
      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (_path, options) => {
        receivedPayload = JSON.parse(String(options?.body || '{}'));
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      const updateResult = await registry.callTool('update_settings', {
        settings: {
          site_logo: 'https://example.com/new-logo.png',
          site_logo_dark: 'https://example.com/new-logo-dark.png',
          footer_text: '© 2027 Updated Site',
        },
      });

      expect(updateResult.isError).toBeFalsy();
      expect(receivedPayload).toEqual({
        settings: {
          site_logo: 'https://example.com/new-logo.png',
          site_logo_dark: 'https://example.com/new-logo-dark.png',
          footer_text: '© 2027 Updated Site',
        },
      });
    });

    it('update_theme_settings previews changes in dry_run mode without calling API', async () => {
      let apiCalled = false;
      server.use(
        http.put('*/api/settings', () => {
          apiCalled = true;
          return HttpResponse.json({ success: true });
        })
      );

      const result = await registry.callTool('update_theme_settings', {
        settings: { theme_color_accent: '#10b981' },
        dry_run: true,
      });

      expect(apiCalled).toBe(false);
      expect(result.isError).toBeFalsy();
      expect((result.toolResult as any).dry_run).toBe(true);
      expect((result.toolResult as any).settings).toEqual({ theme_color_accent: '#10b981' });
      expect(result.content[0].text).toContain('[Dry Run]');
    });

    it('update_theme_settings persists changes via PUT to /api/settings', async () => {
      let receivedBody: any = null;
      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (_path, options) => {
        receivedBody = JSON.parse(String(options?.body || '{}'));
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      const result = await registry.callTool('update_theme_settings', {
        settings: {
          theme_color_accent: '#3b82f6',
          theme_font_size_base: '19px',
        },
      });

      expect(result.isError).toBeFalsy();
      expect(receivedBody).toEqual({
        theme_color_accent: '#3b82f6',
        theme_font_size_base: '19px',
      });
      expect(result.content[0].text).toContain('Theme settings successfully updated');
    });

    it('update_theme_settings falls back to POST if PUT returns 404', async () => {
      let postReceivedBody: any = null;
      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (_path, options) => {
        if (options?.method === 'PUT') {
          return new Response(null, { status: 404 });
        }
        postReceivedBody = JSON.parse(String(options?.body || '{}'));
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      const result = await registry.callTool('update_theme_settings', {
        settings: { theme_color_bg: '#111827' },
      });

      expect(result.isError).toBeFalsy();
      expect(postReceivedBody).toEqual({
        settings: { theme_color_bg: '#111827' },
      });
    });

    it('update_theme_settings handles API error', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockResolvedValue(
        new Response(null, { status: 403, statusText: 'Forbidden' })
      );

      const result = await registry.callTool('update_theme_settings', {
        settings: { theme_color_bg: '#ffffff' },
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to update theme settings');
    });

    it('reset_theme_to_defaults previews reset in dry_run mode', async () => {
      let apiCalled = false;
      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async () => {
        apiCalled = true;
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      const result = await registry.callTool('reset_theme_to_defaults', { dry_run: true });
      expect(apiCalled).toBe(false);
      expect(result.isError).toBeFalsy();
      expect((result.toolResult as any).dry_run).toBe(true);
      expect((result.toolResult as any).settings).toEqual(DEFAULT_THEME_SETTINGS);
      expect(result.content[0].text).toContain('[Dry Run]');
    });

    it('reset_theme_to_defaults persists default theme settings', async () => {
      let receivedSettings: any = null;
      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (_path, options) => {
        receivedSettings = JSON.parse(String(options?.body || '{}'));
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      const result = await registry.callTool('reset_theme_to_defaults');
      expect(result.isError).toBeFalsy();
      expect(receivedSettings).toEqual(DEFAULT_THEME_SETTINGS);
      expect(result.content[0].text).toContain('Theme settings successfully reset to defaults');
    });
  });

  describe('Navigation Menus Tools', () => {
    it('get_menu returns all menus when no slug is provided', async () => {
      server.use(
        http.get('*/api/menus', () => {
          return HttpResponse.json({
            header: {
              name: 'header',
              items_json: JSON.stringify([{ title: 'Home', url: '/' }]),
            },
            footer: {
              name: 'footer',
              items_json: JSON.stringify([{ title: 'Terms', url: '/terms' }]),
            },
          });
        })
      );

      const result = await registry.callTool('get_menu');
      expect(result.isError).toBeFalsy();
      expect((result.toolResult as any).header).toBeDefined();
      expect((result.toolResult as any).footer).toBeDefined();
    });

    it('get_menu returns filtered menu for a specific slug', async () => {
      server.use(
        http.get('*/api/menus', () => {
          return HttpResponse.json({
            header: {
              name: 'header',
              items_json: JSON.stringify([{ title: 'Home', url: '/' }]),
            },
            footer: {
              name: 'footer',
              items_json: JSON.stringify([{ title: 'Terms', url: '/terms' }]),
            },
          });
        })
      );

      const result = await registry.callTool('get_menu', { slug: 'header' });
      expect(result.isError).toBeFalsy();
      expect((result.toolResult as any).name).toBe('header');
      expect(result.content[0].text).toContain('Home');
    });

    it('get_menu returns error when requested menu slug is not found', async () => {
      server.use(
        http.get('*/api/menus', () => {
          return HttpResponse.json({
            header: { name: 'header', items_json: '[]' },
          });
        }),
        http.get('*/api/menus/:slug', () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      const result = await registry.callTool('get_menu', { slug: 'sidebar' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Menu not found for slug: sidebar');
    });

    it('update_menu_items previews menu changes in dry_run mode', async () => {
      let apiCalled = false;
      server.use(
        http.put('*/api/menus/:slug', () => {
          apiCalled = true;
          return HttpResponse.json({ success: true });
        })
      );

      const items = [{ title: 'Docs', url: '/docs', target: '_self', children: [] }];
      const result = await registry.callTool('update_menu_items', {
        slug: 'header',
        items,
        dry_run: true,
      });

      expect(apiCalled).toBe(false);
      expect(result.isError).toBeFalsy();
      expect((result.toolResult as any).dry_run).toBe(true);
      expect((result.toolResult as any).items).toEqual(items);
      expect(result.content[0].text).toContain('[Dry Run]');
    });

    it('update_menu_items updates menu items via PUT /api/menus/:slug', async () => {
      let receivedUrl: string | undefined;
      let receivedBody: any = null;

      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (url, options) => {
        receivedUrl = String(url);
        receivedBody = JSON.parse(String(options?.body));
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
          text: async () => JSON.stringify({ success: true }),
        } as Response;
      });

      const items = [
        { title: 'Articles', url: '/posts', target: '_self', children: [] },
        { title: 'About', url: '/about', target: '_self', children: [] },
      ];

      const result = await registry.callTool('update_menu_items', {
        slug: 'header',
        items,
      });

      expect(result.isError).toBeFalsy();
      expect(receivedUrl).toBe('/api/menus/header');
      expect(receivedBody).toEqual({ items_json: JSON.stringify(items) });
      expect(result.content[0].text).toContain('successfully updated with 2 items');
    });

    it('update_menu_items handles API errors', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: async () => 'Server Error',
      } as Response);

      const result = await registry.callTool('update_menu_items', {
        slug: 'header',
        items: [{ title: 'Home', url: '/' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to update menu items');
    });
  });

  describe('Media Management Tools', () => {
    const mockMediaList = [
      {
        id: '1',
        key: 'photo-1.jpg',
        filename: 'photo-1.jpg',
        title: 'Editorial Hero Photo',
        alt_text: 'Dramatic architectural landscape',
        mime_type: 'image/jpeg',
        size: 102400,
        url: '/media/photo-1.jpg',
      },
      {
        id: '2',
        key: 'logo.png',
        filename: 'logo.png',
        title: 'Zygo Studios Brandmark',
        alt_text: 'Cyan stylized publication brandmark',
        mime_type: 'image/png',
        size: 20480,
        url: '/media/logo.png',
      },
      {
        id: '3',
        key: 'cover-article.webp',
        filename: 'cover-article.webp',
        title: 'Winter Edition Cover',
        alt_text: 'Abstract typographic composition',
        mime_type: 'image/webp',
        size: 51200,
        url: '/media/cover-article.webp',
      },
    ];

    it('list_media returns media items and pagination metadata', async () => {
      server.use(
        http.get('*/api/media', () => {
          return HttpResponse.json({
            media: mockMediaList,
            pagination: { page: 1, per_page: 24, total_items: 3 },
          });
        })
      );

      const result = await registry.callTool('list_media', { page: 1, limit: 10 });
      expect(result.isError).toBeFalsy();
      const res = result.toolResult as any;
      expect(res.media).toHaveLength(3);
      expect(res.total).toBe(3);
      expect(res.page).toBe(1);
    });

    it('list_media filters by query string', async () => {
      server.use(
        http.get('*/api/media', () => {
          return HttpResponse.json({
            media: mockMediaList,
          });
        })
      );

      const result = await registry.callTool('list_media', { query: 'logo' });
      expect(result.isError).toBeFalsy();
      const res = result.toolResult as any;
      expect(res.media).toHaveLength(1);
      expect(res.media[0].filename).toBe('logo.png');
    });

    it('list_media filters by alt_text query', async () => {
      server.use(
        http.get('*/api/media', () => {
          return HttpResponse.json({
            media: mockMediaList,
          });
        })
      );

      const result = await registry.callTool('list_media', { query: 'architectural' });
      expect(result.isError).toBeFalsy();
      const res = result.toolResult as any;
      expect(res.media).toHaveLength(1);
      expect(res.media[0].key).toBe('photo-1.jpg');
    });

    it('list_media handles client-side pagination offset when array is returned directly', async () => {
      server.use(
        http.get('*/api/media', () => {
          return HttpResponse.json(mockMediaList);
        })
      );

      const result = await registry.callTool('list_media', { page: 2, limit: 2 });
      expect(result.isError).toBeFalsy();
      const res = result.toolResult as any;
      expect(res.media).toHaveLength(1);
      expect(res.media[0].filename).toBe('cover-article.webp');
    });

    it('get_media_details fetches specific media item details', async () => {
      server.use(
        http.get('*/api/media/:id', ({ params }) => {
          const item = mockMediaList.find((m) => m.id === params.id || m.key === params.id);
          if (item) return HttpResponse.json(item);
          return new HttpResponse(null, { status: 404 });
        })
      );

      const result = await registry.callTool('get_media_details', { id: '2' });
      expect(result.isError).toBeFalsy();
      expect((result.toolResult as any).filename).toBe('logo.png');
    });

    it('get_media_details falls back to list search if /api/media/:id returns 404', async () => {
      server.use(
        http.get('*/api/media/:id', () => {
          return new HttpResponse(null, { status: 404 });
        }),
        http.get('*/api/media', () => {
          return HttpResponse.json({ media: mockMediaList });
        })
      );

      const result = await registry.callTool('get_media_details', { id: 'photo-1.jpg' });
      expect(result.isError).toBeFalsy();
      expect((result.toolResult as any).id).toBe('1');
    });

    it('get_media_details returns error when media item does not exist', async () => {
      server.use(
        http.get('*/api/media/:id', () => {
          return new HttpResponse(null, { status: 404 });
        }),
        http.get('*/api/media', () => {
          return HttpResponse.json({ media: mockMediaList });
        })
      );

      const result = await registry.callTool('get_media_details', { id: 'nonexistent.png' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Media item not found');
    });

    it('update_media_metadata updates alt_text and title via PUT /api/media/:id', async () => {
      let receivedUrl: string | undefined;
      let receivedBody: any = null;

      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (url, options) => {
        receivedUrl = String(url);
        receivedBody = JSON.parse(String(options?.body));
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
          text: async () => JSON.stringify({ success: true }),
        } as Response;
      });

      const result = await registry.callTool('update_media_metadata', {
        id: 'photo-1.jpg',
        alt_text: 'Updated accessible description',
        title: 'Updated Photo Title',
      });

      expect(result.isError).toBeFalsy();
      expect(receivedUrl).toBe('/api/media/photo-1.jpg');
      expect(receivedBody).toEqual({
        alt_text: 'Updated accessible description',
        title: 'Updated Photo Title',
      });
      expect(result.content[0].text).toContain('Media metadata updated for photo-1.jpg');
    });

    it('update_media_metadata returns error on API failure', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Failed',
        text: async () => 'Failed',
      } as Response);

      const result = await registry.callTool('update_media_metadata', {
        id: 'photo-1.jpg',
        alt_text: 'Accessible description',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to update media metadata');
    });
  });

  describe('useThemeEditorWebMCP Hook and Live ThemeEditor Integration', () => {
    function MockThemeEditorHarness({
      initialTokens = DEFAULT_THEME_TOKENS,
      onSave,
      onSaveAsCustom,
      onSelectPreset,
      onApplyFontPreset,
      selectedThemeName = 'Modern Editorial',
      activeThemeName = 'Modern Editorial',
    }: {
      initialTokens?: Record<string, any>;
      onSave?: () => Promise<any> | void;
      onSaveAsCustom?: (e?: any, name?: string) => Promise<any> | void;
      onSelectPreset?: (themeName: string) => void;
      onApplyFontPreset?: (preset: any) => void;
      selectedThemeName?: string;
      activeThemeName?: string;
    }) {
      const [tokens, setTokens] = React.useState(initialTokens);
      useThemeEditorWebMCP({
        tokens,
        setTokens,
        onReset: () => setTokens(DEFAULT_THEME_TOKENS),
        onSave,
        onSaveAsCustom,
        onSelectPreset,
        onApplyFontPreset,
        selectedThemeName,
        activeThemeName,
      });

      return (
        <div>
          <span data-testid="live-color-accent">{tokens.colorAccent}</span>
          <span data-testid="live-headline-font">{tokens.fontHeadline}</span>
          <span data-testid="live-header-layout">{tokens.headerLayout}</span>
        </div>
      );
    }

    it('registers and exposes theme_get_active_tokens, theme_update_live_tokens, and theme_reset_live_tokens', async () => {
      const testRegistry = new WebMCPRegistry();
      const { unmount } = render(
        <WebMCPProvider registry={testRegistry}>
          <MockThemeEditorHarness />
        </WebMCPProvider>
      );

      // Verify active tokens
      const activeResult = await testRegistry.callTool('theme_get_active_tokens');
      expect(activeResult.isError).toBeFalsy();
      expect((activeResult.toolResult as any).colorAccent).toBe(DEFAULT_THEME_TOKENS.colorAccent);

      // Live update token
      await act(async () => {
        const updateResult = await testRegistry.callTool('theme_update_live_tokens', {
          tokens: {
            colorAccent: '#0ea5e9',
            fontHeadline: 'Fraunces, serif',
            headerLayout: 'split',
          },
        });
        expect(updateResult.isError).toBeFalsy();
      });

      // Verify DOM updated in real time
      expect(screen.getByTestId('live-color-accent').textContent).toBe('#0ea5e9');
      expect(screen.getByTestId('live-headline-font').textContent).toBe('Fraunces, serif');
      expect(screen.getByTestId('live-header-layout').textContent).toBe('split');

      // Verify inspect reflects newly applied tokens
      const updatedInspect = await testRegistry.callTool('theme_get_active_tokens');
      expect((updatedInspect.toolResult as any).colorAccent).toBe('#0ea5e9');

      // Reset live tokens
      await act(async () => {
        const resetResult = await testRegistry.callTool('theme_reset_live_tokens');
        expect(resetResult.isError).toBeFalsy();
      });

      expect(screen.getByTestId('live-color-accent').textContent).toBe(DEFAULT_THEME_TOKENS.colorAccent);

      // Verify all 6 theme editor tools are registered
      expect(testRegistry.getTool('theme_save_active')).toBeDefined();
      expect(testRegistry.getTool('theme_save_as_custom')).toBeDefined();
      expect(testRegistry.getTool('theme_select_preset')).toBeDefined();

      // Unmount should deregister tools
      unmount();
      expect(testRegistry.getTool('theme_get_active_tokens')).toBeUndefined();
      expect(testRegistry.getTool('theme_update_live_tokens')).toBeUndefined();
      expect(testRegistry.getTool('theme_reset_live_tokens')).toBeUndefined();
      expect(testRegistry.getTool('theme_save_active')).toBeUndefined();
      expect(testRegistry.getTool('theme_save_as_custom')).toBeUndefined();
      expect(testRegistry.getTool('theme_select_preset')).toBeUndefined();
    });

    it('theme_save_active invokes onSave handler and reports success', async () => {
      const testRegistry = new WebMCPRegistry();
      const mockSave = vi.fn().mockResolvedValue({ success: true });

      render(
        <WebMCPProvider registry={testRegistry}>
          <MockThemeEditorHarness onSave={mockSave} selectedThemeName="Warm Contemporary" />
        </WebMCPProvider>
      );

      const result = await testRegistry.callTool('theme_save_active', {});
      expect(result.isError).toBeFalsy();
      expect(mockSave).toHaveBeenCalled();
      expect(result.toolResult).toMatchObject({ success: true, theme: 'Warm Contemporary' });
    });

    it('theme_save_as_custom invokes onSaveAsCustom with custom theme name', async () => {
      const testRegistry = new WebMCPRegistry();
      const mockSaveAsCustom = vi.fn().mockResolvedValue({ success: true });

      render(
        <WebMCPProvider registry={testRegistry}>
          <MockThemeEditorHarness onSaveAsCustom={mockSaveAsCustom} />
        </WebMCPProvider>
      );

      const emptyResult = await testRegistry.callTool('theme_save_as_custom', { name: '' });
      expect(emptyResult.isError).toBe(true);
      expect(emptyResult.content[0].text).toContain('non-empty custom theme name is required');

      const result = await testRegistry.callTool('theme_save_as_custom', { name: 'My Cyber Theme' });
      expect(result.isError).toBeFalsy();
      expect(mockSaveAsCustom).toHaveBeenCalledWith(undefined, 'My Cyber Theme');
      expect(result.toolResult).toMatchObject({ success: true, themeName: 'My Cyber Theme' });
    });

    it('theme_select_preset invokes onSelectPreset and onApplyFontPreset', async () => {
      const testRegistry = new WebMCPRegistry();
      const mockSelectPreset = vi.fn();
      const mockApplyFont = vi.fn();

      render(
        <WebMCPProvider registry={testRegistry}>
          <MockThemeEditorHarness
            onSelectPreset={mockSelectPreset}
            onApplyFontPreset={mockApplyFont}
          />
        </WebMCPProvider>
      );

      const result = await testRegistry.callTool('theme_select_preset', {
        theme_name: 'Bento-Brutalism',
        font_preset: 'Space Grotesk & IBM Plex Mono',
      });

      expect(result.isError).toBeFalsy();
      expect(mockSelectPreset).toHaveBeenCalledWith('Bento-Brutalism');
      expect(mockApplyFont).toHaveBeenCalledWith('Space Grotesk & IBM Plex Mono');
      expect(result.toolResult).toMatchObject({
        success: true,
        applied: {
          theme_name: 'Bento-Brutalism',
          font_preset: 'Space Grotesk & IBM Plex Mono',
        },
      });

      const darkResult = await testRegistry.callTool('theme_select_preset', {
        theme_name: 'Bento-Brutalism (Dark)',
      });
      expect(darkResult.isError).toBeFalsy();
      expect(mockSelectPreset).toHaveBeenCalledWith('Bento-Brutalism (Dark)');
    });

    it('integrates seamlessly with the real ThemeEditor component', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          theme_color_accent: '#991b1b',
          theme_header_tagline: 'Initial Masthead Tagline',
        }),
      } as Response);

      const testRegistry = new WebMCPRegistry();
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      });

      const router = createMemoryRouter([
        {
          path: '/',
          element: (
            <Theme>
              <WebMCPProvider registry={testRegistry}>
                <QueryClientProvider client={queryClient}>
                  <ThemeEditor initialTokens={MODERN_EDITORIAL_PRESET} />
                </QueryClientProvider>
              </WebMCPProvider>
            </Theme>
          ),
        },
      ]);

      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText('Theme Settings')).toBeDefined();
      });

      // Verify the WebMCP tools are registered
      expect(testRegistry.getTool('theme_get_active_tokens')).toBeDefined();
      expect(testRegistry.getTool('theme_update_live_tokens')).toBeDefined();
      expect(testRegistry.getTool('theme_reset_live_tokens')).toBeDefined();
      expect(testRegistry.getTool('theme_save_active')).toBeDefined();
      expect(testRegistry.getTool('theme_save_as_custom')).toBeDefined();
      expect(testRegistry.getTool('theme_select_preset')).toBeDefined();

      // Inspect live tokens
      const inspect = await testRegistry.callTool('theme_get_active_tokens');
      expect(inspect.isError).toBeFalsy();

      // Live update theme token via WebMCP
      await act(async () => {
        await testRegistry.callTool('theme_update_live_tokens', {
          tokens: {
            colorAccent: '#16a34a',
            headerTagline: 'WebMCP Live Synchronized Tagline',
          },
        });
      });

      // Verify the preview reflects the live updated tagline
      expect(screen.getByText('WebMCP Live Synchronized Tagline')).toBeDefined();
    });
  });

  describe('useNavigationEditorWebMCP Hook and Navigation Integration', () => {
    function MockNavigationHarness() {
      const [activeTab, setActiveTab] = React.useState<'header' | 'footer'>('header');
      const [localMenus, setLocalMenus] = React.useState({
        header: [{ title: 'Home', url: '/', target: '_self', children: [] }],
        footer: [{ title: 'Privacy', url: '/privacy', target: '_self', children: [] }],
      });
      const saveMenu = vi.fn().mockResolvedValue({ success: true });
      const addItem = (tab: 'header' | 'footer', item: any) => {
        setLocalMenus((prev) => ({
          ...prev,
          [tab]: [...prev[tab], item],
        }));
      };
      const deleteItem = (tab: 'header' | 'footer', index: number) => {
        setLocalMenus((prev) => {
          const next = [...prev[tab]];
          next.splice(index, 1);
          return { ...prev, [tab]: next };
        });
      };
      const setItems = (tab: 'header' | 'footer', items: any[]) => {
        setLocalMenus((prev) => ({ ...prev, [tab]: items }));
      };

      useNavigationEditorWebMCP({
        activeTab,
        setActiveTab,
        localMenus,
        sitePages: [{ id: 1, title: 'About Us', path: '/about' }],
        addItem,
        deleteItem,
        setItems,
        saveMenu,
        isSaving: false,
        isSaved: false,
      });

      return (
        <div>
          <span data-testid="active-nav-tab">{activeTab}</span>
          <span data-testid="header-count">{localMenus.header.length}</span>
          <span data-testid="footer-count">{localMenus.footer.length}</span>
        </div>
      );
    }

    it('registers and unregisters all 6 navigation tools on mount/unmount', () => {
      const navRegistry = new WebMCPRegistry();
      const { unmount } = render(
        <WebMCPProvider registry={navRegistry}>
          <MockNavigationHarness />
        </WebMCPProvider>
      );

      expect(navRegistry.getTool('navigation_get_active_state')).toBeDefined();
      expect(navRegistry.getTool('navigation_set_tab')).toBeDefined();
      expect(navRegistry.getTool('navigation_add_item')).toBeDefined();
      expect(navRegistry.getTool('navigation_delete_item')).toBeDefined();
      expect(navRegistry.getTool('navigation_set_items')).toBeDefined();
      expect(navRegistry.getTool('navigation_save')).toBeDefined();

      unmount();

      expect(navRegistry.getTool('navigation_get_active_state')).toBeUndefined();
      expect(navRegistry.getTool('navigation_set_tab')).toBeUndefined();
      expect(navRegistry.getTool('navigation_add_item')).toBeUndefined();
      expect(navRegistry.getTool('navigation_delete_item')).toBeUndefined();
      expect(navRegistry.getTool('navigation_set_items')).toBeUndefined();
      expect(navRegistry.getTool('navigation_save')).toBeUndefined();
    });

    it('navigation_get_active_state returns full editor snapshot', async () => {
      const navRegistry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={navRegistry}>
          <MockNavigationHarness />
        </WebMCPProvider>
      );

      const res = await navRegistry.callTool('navigation_get_active_state', {});
      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toMatchObject({
        activeTab: 'header',
        header: [{ title: 'Home', url: '/' }],
        footer: [{ title: 'Privacy', url: '/privacy' }],
        sitePages: [{ id: 1, title: 'About Us', path: '/about' }],
      });
    });

    it('navigation_set_tab switches the active tab', async () => {
      const navRegistry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={navRegistry}>
          <MockNavigationHarness />
        </WebMCPProvider>
      );

      await act(async () => {
        const res = await navRegistry.callTool('navigation_set_tab', { tab: 'footer' });
        expect(res.isError).toBeFalsy();
      });

      expect(screen.getByTestId('active-nav-tab').textContent).toBe('footer');
    });

    it('navigation_add_item and navigation_delete_item manipulate menu items', async () => {
      const navRegistry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={navRegistry}>
          <MockNavigationHarness />
        </WebMCPProvider>
      );

      await act(async () => {
        const addRes = await navRegistry.callTool('navigation_add_item', {
          tab: 'header',
          title: 'Docs',
          url: '/docs',
        });
        expect(addRes.isError).toBeFalsy();
      });

      expect(screen.getByTestId('header-count').textContent).toBe('2');

      await act(async () => {
        const delRes = await navRegistry.callTool('navigation_delete_item', {
          tab: 'header',
          index: 1,
        });
        expect(delRes.isError).toBeFalsy();
      });

      expect(screen.getByTestId('header-count').textContent).toBe('1');
    });

    it('navigation_set_items and navigation_save invoke handlers correctly', async () => {
      const navRegistry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={navRegistry}>
          <MockNavigationHarness />
        </WebMCPProvider>
      );

      await act(async () => {
        const setRes = await navRegistry.callTool('navigation_set_items', {
          tab: 'header',
          items: [
            { title: 'Page 1', url: '/p1' },
            { title: 'Page 2', url: '/p2' },
          ],
          save: true,
        });
        expect(setRes.isError).toBeFalsy();
      });

      expect(screen.getByTestId('header-count').textContent).toBe('2');

      const saveRes = await navRegistry.callTool('navigation_save', { tab: 'header' });
      expect(saveRes.isError).toBeFalsy();
    });
  });
});
