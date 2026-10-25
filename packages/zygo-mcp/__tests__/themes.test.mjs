import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tools, handleCallTool } from '../index.mjs';

describe('Zygo MCP CLI Bridge - Themes Management Tools', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Definitions', () => {
    it('registers all 7 theme management tools with strict schemas', () => {
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('zygo_list_themes');
      expect(toolNames).toContain('zygo_get_theme');
      expect(toolNames).toContain('zygo_create_theme');
      expect(toolNames).toContain('zygo_activate_theme');
      expect(toolNames).toContain('zygo_duplicate_theme');
      expect(toolNames).toContain('zygo_rename_theme');
      expect(toolNames).toContain('zygo_delete_theme');

      const listThemes = tools.find((t) => t.name === 'zygo_list_themes');
      expect(listThemes.inputSchema.type).toBe('object');

      const getTheme = tools.find((t) => t.name === 'zygo_get_theme');
      expect(getTheme.inputSchema.type).toBe('object');
      expect(getTheme.inputSchema.required).toEqual(['id']);

      const createTheme = tools.find((t) => t.name === 'zygo_create_theme');
      expect(createTheme.inputSchema.type).toBe('object');
      expect(createTheme.inputSchema.required).toEqual(['name']);

      const activateTheme = tools.find((t) => t.name === 'zygo_activate_theme');
      expect(activateTheme.inputSchema.type).toBe('object');
      expect(activateTheme.inputSchema.required).toEqual(['role']);

      const duplicateTheme = tools.find((t) => t.name === 'zygo_duplicate_theme');
      expect(duplicateTheme.inputSchema.type).toBe('object');
      expect(duplicateTheme.inputSchema.required).toEqual(['id']);

      const renameTheme = tools.find((t) => t.name === 'zygo_rename_theme');
      expect(renameTheme.inputSchema.type).toBe('object');
      expect(renameTheme.inputSchema.required).toEqual(['id', 'name']);

      const deleteTheme = tools.find((t) => t.name === 'zygo_delete_theme');
      expect(deleteTheme.inputSchema.type).toBe('object');
      expect(deleteTheme.inputSchema.required).toEqual(['id']);
    });
  });

  describe('zygo_list_themes', () => {
    it('fetches themes and settings to return themes list with active role indicators', async () => {
      const mockThemes = [
        { id: 'modern-editorial', name: 'Modern Editorial', isLocked: true },
        { id: 'dark-cyber', name: 'Dark Cyber', isLocked: false }
      ];
      const mockSettings = {
        theme_primary_id: 'modern-editorial',
        theme_dark_id: 'dark-cyber'
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockThemes
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSettings
        });

      const res = await handleCallTool({
        params: {
          name: 'zygo_list_themes',
          arguments: {}
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual({
        themes: mockThemes,
        themePrimaryId: 'modern-editorial',
        themeDarkId: 'dark-cyber'
      });
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/themes'), expect.anything());
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/settings'), expect.anything());
    });

    it('falls back to active_name and null dark_id when settings are partial or empty', async () => {
      const mockThemes = [
        { id: 'warm-contemporary', name: 'Warm Contemporary', isLocked: true }
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockThemes
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ theme_active_name: 'Warm Contemporary' })
        });

      const res = await handleCallTool({
        params: {
          name: 'zygo_list_themes',
          arguments: {}
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult.themePrimaryId).toBe('warm-contemporary');
      expect(res.toolResult.themeDarkId).toBeNull();
    });

    it('handles failure when fetching themes fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({})
        });

      const res = await handleCallTool({
        params: {
          name: 'zygo_list_themes',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('HTTP 500');
    });
  });

  describe('zygo_get_theme', () => {
    it('fetches specific theme by ID via GET /api/themes/:id', async () => {
      const mockTheme = {
        id: 'modern-editorial',
        name: 'Modern Editorial',
        tokens: { colorBg: '#ffffff', colorAccent: '#991b1b' }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTheme
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_get_theme',
          arguments: { id: 'modern-editorial' }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockTheme);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/themes/modern-editorial'),
        expect.anything()
      );
    });

    it('throws error when id argument is missing', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_get_theme',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Theme ID is required');
    });

    it('handles not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Theme not found'
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_get_theme',
          arguments: { id: 'nonexistent' }
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('HTTP 404');
    });
  });

  describe('zygo_create_theme', () => {
    it('creates a new custom theme via POST /api/themes', async () => {
      const createdTheme = {
        id: 'custom-ocean',
        name: 'Custom Ocean',
        description: 'Ocean theme',
        tokens: { colorAccent: '#0ea5e9' }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createdTheme
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_create_theme',
          arguments: {
            name: 'Custom Ocean',
            description: 'Ocean theme',
            baseThemeId: 'modern-editorial',
            tokens: { colorAccent: '#0ea5e9' }
          }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(createdTheme);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/themes'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Custom Ocean',
            description: 'Ocean theme',
            baseThemeId: 'modern-editorial',
            base_theme_id: 'modern-editorial',
            tokens: { colorAccent: '#0ea5e9' }
          })
        })
      );
    });

    it('validates required name field', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_create_theme',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Theme name is required');
    });

    it('handles server failure during theme creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Theme name already exists'
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_create_theme',
          arguments: { name: 'Existing Theme' }
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('HTTP 400');
    });
  });

  describe('zygo_activate_theme', () => {
    it('activates primary theme via PUT /api/themes/activate', async () => {
      const mockResult = {
        success: true,
        themePrimaryId: 'custom-ocean',
        themeDarkId: null
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_activate_theme',
          arguments: {
            id: 'custom-ocean',
            role: 'primary'
          }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockResult);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/themes/activate'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ id: 'custom-ocean', role: 'primary' })
        })
      );
    });

    it('clears dark theme variant when id is null', async () => {
      const mockResult = {
        success: true,
        themePrimaryId: 'modern-editorial',
        themeDarkId: null
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_activate_theme',
          arguments: {
            id: null,
            role: 'dark'
          }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockResult);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/themes/activate'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ id: null, role: 'dark' })
        })
      );
    });

    it('validates role requirement', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_activate_theme',
          arguments: { id: 'modern-editorial' }
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Role is required');
    });
  });

  describe('zygo_duplicate_theme', () => {
    it('duplicates theme via POST /api/themes/:id/duplicate', async () => {
      const duplicatedTheme = {
        id: 'modern-editorial-copy',
        name: 'Modern Editorial copy',
        isLocked: false
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => duplicatedTheme
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_duplicate_theme',
          arguments: { id: 'modern-editorial' }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(duplicatedTheme);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/themes/modern-editorial/duplicate'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('validates missing id parameter', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_duplicate_theme',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Theme ID is required');
    });
  });

  describe('zygo_rename_theme', () => {
    it('renames a custom theme via PUT /api/themes/:id/rename', async () => {
      const renamedTheme = {
        id: 'custom-ocean',
        name: 'Pacific Blue'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => renamedTheme
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_rename_theme',
          arguments: {
            id: 'custom-ocean',
            name: 'Pacific Blue'
          }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(renamedTheme);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/themes/custom-ocean/rename'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Pacific Blue' })
        })
      );
    });

    it('validates missing id or name parameter', async () => {
      const res1 = await handleCallTool({
        params: {
          name: 'zygo_rename_theme',
          arguments: { name: 'New Name' }
        }
      });
      expect(res1.isError).toBe(true);
      expect(res1.content[0].text).toContain('Theme ID is required');

      const res2 = await handleCallTool({
        params: {
          name: 'zygo_rename_theme',
          arguments: { id: 'custom-ocean' }
        }
      });
      expect(res2.isError).toBe(true);
      expect(res2.content[0].text).toContain('Theme name is required');
    });

    it('handles forbidden error when attempting to rename locked built-in theme', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Cannot modify locked built-in theme'
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_rename_theme',
          arguments: {
            id: 'modern-editorial',
            name: 'Renamed Locked'
          }
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('HTTP 403');
    });
  });

  describe('zygo_delete_theme', () => {
    it('deletes a custom theme via DELETE /api/themes/:id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_delete_theme',
          arguments: { id: 'custom-ocean' }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/themes/custom-ocean'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('validates missing id parameter', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_delete_theme',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Theme ID is required');
    });

    it('handles failure when attempting to delete active theme', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Cannot delete active theme'
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_delete_theme',
          arguments: { id: 'active-theme' }
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('HTTP 400');
    });
  });
});
