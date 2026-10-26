import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tools, handleCallTool } from '../index.mjs';

describe('Zygo MCP CLI Bridge - Navigation, Media, and Theme Tools', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Definitions', () => {
    it('registers navigation, media, and theme settings tools with schemas', () => {
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('zygo_get_menu');
      expect(toolNames).toContain('zygo_update_menu');
      expect(toolNames).toContain('zygo_list_media');
      expect(toolNames).toContain('zygo_delete_media');
      expect(toolNames).toContain('zygo_get_theme_settings');
      expect(toolNames).toContain('zygo_update_theme_settings');
      expect(toolNames).toContain('zygo_reset_theme_to_defaults');
      expect(toolNames).toContain('zygo_get_settings');
      expect(toolNames).toContain('zygo_update_settings');

      const getSettings = tools.find((t) => t.name === 'zygo_get_settings');
      expect(getSettings.inputSchema.type).toBe('object');

      const updateSettings = tools.find((t) => t.name === 'zygo_update_settings');
      expect(updateSettings.inputSchema.type).toBe('object');
      expect(updateSettings.inputSchema.required).toContain('settings');
      expect(updateSettings.inputSchema.properties.settings.properties).toHaveProperty('analytics_enabled');
      expect(updateSettings.inputSchema.properties.settings.properties).toHaveProperty('analytics_site_tag');

      const getMenu = tools.find((t) => t.name === 'zygo_get_menu');
      expect(getMenu.inputSchema.type).toBe('object');

      const updateMenu = tools.find((t) => t.name === 'zygo_update_menu');
      expect(updateMenu.inputSchema.type).toBe('object');
      expect(updateMenu.inputSchema.required).toContain('items');

      const listMedia = tools.find((t) => t.name === 'zygo_list_media');
      expect(listMedia.inputSchema.type).toBe('object');

      const deleteMedia = tools.find((t) => t.name === 'zygo_delete_media');
      expect(deleteMedia.inputSchema.type).toBe('object');

      const getTheme = tools.find((t) => t.name === 'zygo_get_theme_settings');
      expect(getTheme.inputSchema.type).toBe('object');

      const updateTheme = tools.find((t) => t.name === 'zygo_update_theme_settings');
      expect(updateTheme.inputSchema.type).toBe('object');
      expect(updateTheme.inputSchema.required).toContain('settings');

      const resetTheme = tools.find((t) => t.name === 'zygo_reset_theme_to_defaults');
      expect(resetTheme.inputSchema.type).toBe('object');
    });
  });

  describe('Navigation Menus execution', () => {
    describe('zygo_get_menu', () => {
      it('fetches header menu by default via GET /api/menus/header', async () => {
        const mockMenu = {
          name: 'header',
          items: [
            { title: 'Home', url: '/' },
            { title: 'About', url: '/about' }
          ]
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockMenu
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_get_menu',
            arguments: {}
          }
        });

        expect(res.isError).toBeFalsy();
        expect(res.toolResult).toEqual(mockMenu);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/menus/header'),
          expect.anything()
        );
      });

      it('fetches specific menu by slug (e.g. footer)', async () => {
        const mockMenu = {
          name: 'footer',
          items: [{ title: 'Privacy', url: '/privacy' }]
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockMenu
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_get_menu',
            arguments: { slug: 'footer' }
          }
        });

        expect(res.isError).toBeFalsy();
        expect(res.toolResult).toEqual(mockMenu);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/menus/footer'),
          expect.anything()
        );
      });

      it('handles error when fetching menu fails', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => 'Menu not found'
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_get_menu',
            arguments: { slug: 'nonexistent' }
          }
        });

        expect(res.isError).toBe(true);
        expect(res.content[0].text).toContain('404');
      });
    });

    describe('zygo_update_menu', () => {
      it('updates menu items via PUT /api/menus/header', async () => {
        const items = [
          { title: 'Home', url: '/' },
          { title: 'Docs', url: '/docs' }
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, name: 'header', items })
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_update_menu',
            arguments: { items }
          }
        });

        expect(res.isError).toBeFalsy();
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/menus/header'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('"title":"Home"')
          })
        );
      });

      it('updates custom menu slug via PUT /api/menus/<slug>', async () => {
        const items = [{ title: 'Terms', url: '/terms' }];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, name: 'footer', items })
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_update_menu',
            arguments: { slug: 'footer', items }
          }
        });

        expect(res.isError).toBeFalsy();
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/menus/footer'),
          expect.objectContaining({
            method: 'PUT'
          })
        );
      });

      it('validates required items parameter', async () => {
        const res = await handleCallTool({
          params: {
            name: 'zygo_update_menu',
            arguments: { slug: 'header' }
          }
        });

        expect(res.isError).toBe(true);
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });
  });

  describe('Media execution', () => {
    describe('zygo_list_media', () => {
      it('calls GET /api/media and returns media files', async () => {
        const mockMedia = [
          { key: 'uploads/hero.jpg', filename: 'hero.jpg', url: 'https://cdn.example.com/hero.jpg' },
          { key: 'uploads/logo.svg', filename: 'logo.svg', url: 'https://cdn.example.com/logo.svg' }
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockMedia
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_list_media',
            arguments: {}
          }
        });

        expect(res.isError).toBeFalsy();
        expect(res.toolResult).toEqual(mockMedia);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/media'),
          expect.anything()
        );
      });

      it('passes query parameters when provided', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => []
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_list_media',
            arguments: { page: 2, limit: 10, query: 'banner' }
          }
        });

        expect(res.isError).toBeFalsy();
        const calledUrl = mockFetch.mock.calls[0][0];
        expect(calledUrl).toContain('/api/media');
      });

      it('handles HTTP error gracefully on listing media', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error'
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_list_media',
            arguments: {}
          }
        });

        expect(res.isError).toBe(true);
        expect(res.content[0].text).toContain('HTTP 500');
      });
    });

    describe('zygo_delete_media', () => {
      it('sends DELETE request to /api/media/<key>', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, key: 'uploads/old-photo.jpg' })
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_delete_media',
            arguments: { key: 'uploads/old-photo.jpg' }
          }
        });

        expect(res.isError).toBeFalsy();
        expect(res.toolResult).toEqual({ success: true, key: 'uploads/old-photo.jpg' });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/media/uploads/old-photo.jpg'),
          expect.objectContaining({
            method: 'DELETE'
          })
        );
      });

      it('validates key requirement on delete_media', async () => {
        const res = await handleCallTool({
          params: {
            name: 'zygo_delete_media',
            arguments: {}
          }
        });

        expect(res.isError).toBe(true);
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });
  });

  describe('Theme Settings execution', () => {
    describe('zygo_get_theme_settings', () => {
      it('calls GET /api/settings and returns settings map', async () => {
        const mockSettings = {
          theme_color_accent: '#991b1b',
          theme_font_headline: "'Newsreader', serif",
          site_title: 'Zygo CMS'
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSettings
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_get_theme_settings',
            arguments: {}
          }
        });

        expect(res.isError).toBeFalsy();
        expect(res.toolResult).toEqual(mockSettings);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/settings'),
          expect.anything()
        );
      });

      it('handles error fetching theme settings', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Database Error'
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_get_theme_settings',
            arguments: {}
          }
        });

        expect(res.isError).toBe(true);
        expect(res.content[0].text).toContain('500');
      });
    });

    describe('zygo_update_theme_settings', () => {
      it('sends POST request to /api/settings with updated theme settings', async () => {
        const updatedSettings = {
          theme_color_accent: '#2563eb',
          theme_max_width: '1440px'
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, settings: updatedSettings })
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_update_theme_settings',
            arguments: { settings: updatedSettings }
          }
        });

        expect(res.isError).toBeFalsy();
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/settings'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"theme_color_accent":"#2563eb"')
          })
        );
      });

      it('validates settings parameter on update_theme_settings', async () => {
        const res = await handleCallTool({
          params: {
            name: 'zygo_update_theme_settings',
            arguments: {}
          }
        });

        expect(res.isError).toBe(true);
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('zygo_reset_theme_to_defaults', () => {
      it('sends POST request to /api/settings to reset theme tokens to defaults', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, reset: true })
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_reset_theme_to_defaults',
            arguments: {}
          }
        });

        expect(res.isError).toBeFalsy();
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/settings'),
          expect.objectContaining({
            method: 'POST'
          })
        );
      });

      it('handles error when resetting theme settings fails', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Reset failed'
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_reset_theme_to_defaults',
            arguments: {}
          }
        });

        expect(res.isError).toBe(true);
        expect(res.content[0].text).toContain('500');
      });
    });
  });

  describe('Site Settings execution (zygo_get_settings & zygo_update_settings)', () => {
    describe('zygo_get_settings', () => {
      it('fetches settings including analytics_enabled and analytics_site_tag', async () => {
        const mockSettings = {
          site_title: 'My Site',
          analytics_enabled: 'true',
          analytics_site_tag: 'cf-tag-rum-987'
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSettings
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_get_settings',
            arguments: {}
          }
        });

        expect(res.isError).toBeFalsy();
        expect(res.toolResult).toEqual(mockSettings);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/settings'),
          expect.anything()
        );
      });
    });

    describe('zygo_update_settings', () => {
      it('updates settings including analytics_enabled and analytics_site_tag via POST /api/settings', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_update_settings',
            arguments: {
              settings: {
                analytics_enabled: 'true',
                analytics_site_tag: 'cf-tag-updated-000'
              }
            }
          }
        });

        expect(res.isError).toBeFalsy();
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/settings'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              settings: {
                analytics_enabled: 'true',
                analytics_site_tag: 'cf-tag-updated-000'
              }
            })
          })
        );
      });
    });
  });
});
