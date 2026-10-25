import '../test/setup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as apiModule from '../utils/api';
import { WebMCPRegistry } from '../lib/webmcp/registry';
import { createGlobalThemeMediaMenuTools } from '../lib/webmcp/themeAndMediaTools';

describe('WebMCP Themes Management Tools', () => {
  let registry: WebMCPRegistry;

  beforeEach(() => {
    vi.restoreAllMocks();
    registry = new WebMCPRegistry();
    registry.registerTools(createGlobalThemeMediaMenuTools());
  });

  describe('Tool Registration', () => {
    it('registers all 7 theme management tools with strict schemas', () => {
      const toolNames = registry.getTools().map((t) => t.name);
      expect(toolNames).toContain('theme_list');
      expect(toolNames).toContain('theme_get');
      expect(toolNames).toContain('theme_create');
      expect(toolNames).toContain('theme_activate');
      expect(toolNames).toContain('theme_duplicate');
      expect(toolNames).toContain('theme_rename');
      expect(toolNames).toContain('theme_delete');

      const listTool = registry.getTool('theme_list');
      expect(listTool?.inputSchema.type).toBe('object');

      const getTool = registry.getTool('theme_get');
      expect(getTool?.inputSchema.required).toEqual(['id']);

      const createTool = registry.getTool('theme_create');
      expect(createTool?.inputSchema.required).toEqual(['name']);

      const activateTool = registry.getTool('theme_activate');
      expect(activateTool?.inputSchema.required).toEqual(['role']);

      const duplicateTool = registry.getTool('theme_duplicate');
      expect(duplicateTool?.inputSchema.required).toEqual(['id']);

      const renameTool = registry.getTool('theme_rename');
      expect(renameTool?.inputSchema.required).toEqual(['id', 'name']);

      const deleteTool = registry.getTool('theme_delete');
      expect(deleteTool?.inputSchema.required).toEqual(['id']);
    });
  });

  describe('theme_list', () => {
    it('returns all themes with themePrimaryId and themeDarkId indicators', async () => {
      const mockThemes = [
        { id: 'modern-editorial', name: 'Modern Editorial', isLocked: true },
        { id: 'custom-twilight', name: 'Custom Twilight', isLocked: false },
      ];

      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (url: string) => {
        if (url === '/api/themes') {
          return new Response(JSON.stringify(mockThemes), { status: 200 });
        }
        if (url === '/api/settings') {
          return new Response(
            JSON.stringify({
              theme_primary_id: 'modern-editorial',
              theme_dark_id: 'custom-twilight',
            }),
            { status: 200 }
          );
        }
        return new Response(null, { status: 404 });
      });

      const result = await registry.callTool('theme_list');
      expect(result.isError).toBeFalsy();
      expect(result.toolResult).toEqual({
        themes: mockThemes,
        themePrimaryId: 'modern-editorial',
        themeDarkId: 'custom-twilight',
      });
      expect(result.content[0].text).toContain('modern-editorial');
      expect(result.content[0].text).toContain('custom-twilight');
    });

    it('falls back to active name and null dark variant when settings are partial', async () => {
      const mockThemes = [
        { id: 'warm-contemporary', name: 'Warm Contemporary', isLocked: true },
      ];

      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (url: string) => {
        if (url === '/api/themes') {
          return new Response(JSON.stringify(mockThemes), { status: 200 });
        }
        if (url === '/api/settings') {
          return new Response(
            JSON.stringify({
              theme_active_name: 'Warm Contemporary',
            }),
            { status: 200 }
          );
        }
        return new Response(null, { status: 404 });
      });

      const result = await registry.callTool('theme_list');
      expect(result.isError).toBeFalsy();
      expect(result.toolResult.themePrimaryId).toBe('warm-contemporary');
      expect(result.toolResult.themeDarkId).toBeNull();
    });

    it('handles failure when /api/themes returns error', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (url: string) => {
        if (url === '/api/themes') {
          return new Response(null, { status: 500, statusText: 'Internal Server Error' });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      });

      const result = await registry.callTool('theme_list');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to fetch themes');
    });
  });

  describe('theme_get', () => {
    it('returns specific theme by ID', async () => {
      const mockTheme = {
        id: 'modern-editorial',
        name: 'Modern Editorial',
        tokens: { colorBg: '#faf8f5', colorAccent: '#991b1b' },
      };

      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (url: string) => {
        if (url === '/api/themes/modern-editorial') {
          return new Response(JSON.stringify(mockTheme), { status: 200 });
        }
        return new Response(null, { status: 404 });
      });

      const result = await registry.callTool('theme_get', { id: 'modern-editorial' });
      expect(result.isError).toBeFalsy();
      expect(result.toolResult).toEqual(mockTheme);
      expect(result.content[0].text).toContain('#991b1b');
    });

    it('validates required ID argument', async () => {
      const result = await registry.callTool('theme_get', { id: '   ' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Theme ID is required');
    });

    it('handles 404 when theme is not found', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ message: 'Theme not found' }), {
          status: 404,
          statusText: 'Not Found',
        });
      });

      const result = await registry.callTool('theme_get', { id: 'missing' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Theme not found');
    });
  });

  describe('theme_create', () => {
    it('creates a custom theme via POST /api/themes', async () => {
      let capturedUrl = '';
      let capturedOptions: any = null;

      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (url: string, options?: RequestInit) => {
        capturedUrl = url;
        capturedOptions = options;
        const body = JSON.parse(String(options?.body || '{}'));
        return new Response(
          JSON.stringify({
            id: 'custom-forest',
            name: body.name,
            description: body.description,
            tokens: body.tokens,
          }),
          { status: 201 }
        );
      });

      const result = await registry.callTool('theme_create', {
        name: 'Custom Forest',
        description: 'Green accents theme',
        baseThemeId: 'modern-editorial',
        tokens: { colorAccent: '#15803d' },
      });

      expect(result.isError).toBeFalsy();
      expect(result.toolResult.id).toBe('custom-forest');
      expect(capturedUrl).toBe('/api/themes');
      expect(capturedOptions?.method).toBe('POST');
      const parsedBody = JSON.parse(capturedOptions.body);
      expect(parsedBody.name).toBe('Custom Forest');
      expect(parsedBody.description).toBe('Green accents theme');
      expect(parsedBody.baseThemeId).toBe('modern-editorial');
      expect(parsedBody.tokens.colorAccent).toBe('#15803d');
    });

    it('validates missing name parameter', async () => {
      const result = await registry.callTool('theme_create', { name: '' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Theme name is required');
    });

    it('handles API errors during creation', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ message: 'Name already taken' }), {
          status: 400,
          statusText: 'Bad Request',
        });
      });

      const result = await registry.callTool('theme_create', { name: 'Existing' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Name already taken');
    });
  });

  describe('theme_activate', () => {
    it('activates primary theme via PUT /api/themes/activate', async () => {
      let capturedUrl = '';
      let capturedOptions: any = null;

      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (url: string, options?: RequestInit) => {
        capturedUrl = url;
        capturedOptions = options;
        const body = JSON.parse(String(options?.body || '{}'));
        return new Response(
          JSON.stringify({
            success: true,
            themePrimaryId: body.id,
            themeDarkId: null,
          }),
          { status: 200 }
        );
      });

      const result = await registry.callTool('theme_activate', {
        id: 'custom-forest',
        role: 'primary',
      });

      expect(result.isError).toBeFalsy();
      expect(result.toolResult.themePrimaryId).toBe('custom-forest');
      expect(capturedUrl).toBe('/api/themes/activate');
      expect(capturedOptions?.method).toBe('PUT');
      expect(JSON.parse(capturedOptions.body)).toEqual({ id: 'custom-forest', role: 'primary' });
    });

    it('clears dark theme variant when id is null', async () => {
      let capturedOptions: any = null;

      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (_url: string, options?: RequestInit) => {
        capturedOptions = options;
        return new Response(
          JSON.stringify({
            success: true,
            themePrimaryId: 'modern-editorial',
            themeDarkId: null,
          }),
          { status: 200 }
        );
      });

      const result = await registry.callTool('theme_activate', {
        id: null,
        role: 'dark',
      });

      expect(result.isError).toBeFalsy();
      expect(JSON.parse(capturedOptions.body)).toEqual({ id: null, role: 'dark' });
      expect(result.toolResult.themeDarkId).toBeNull();
    });

    it('validates role parameter', async () => {
      const result = await registry.callTool('theme_activate', {
        id: 'some-theme',
        role: 'invalid_role',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Role must be either "primary" or "dark"');
    });

    it('handles API error when theme not found', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ message: 'Theme does not exist' }), {
          status: 404,
          statusText: 'Not Found',
        });
      });

      const result = await registry.callTool('theme_activate', {
        id: 'nonexistent',
        role: 'primary',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Theme does not exist');
    });
  });

  describe('theme_duplicate', () => {
    it('duplicates theme via POST /api/themes/:id/duplicate', async () => {
      let capturedUrl = '';
      let capturedOptions: any = null;

      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (url: string, options?: RequestInit) => {
        capturedUrl = url;
        capturedOptions = options;
        return new Response(
          JSON.stringify({
            id: 'modern-editorial-copy',
            name: 'Modern Editorial copy',
            isLocked: false,
          }),
          { status: 201 }
        );
      });

      const result = await registry.callTool('theme_duplicate', { id: 'modern-editorial' });
      expect(result.isError).toBeFalsy();
      expect(result.toolResult.id).toBe('modern-editorial-copy');
      expect(capturedUrl).toBe('/api/themes/modern-editorial/duplicate');
      expect(capturedOptions?.method).toBe('POST');
    });

    it('validates missing id parameter', async () => {
      const result = await registry.callTool('theme_duplicate', { id: '' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Theme ID is required');
    });
  });

  describe('theme_rename', () => {
    it('renames custom theme via PUT /api/themes/:id/rename', async () => {
      let capturedUrl = '';
      let capturedOptions: any = null;

      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (url: string, options?: RequestInit) => {
        capturedUrl = url;
        capturedOptions = options;
        const body = JSON.parse(String(options?.body || '{}'));
        return new Response(
          JSON.stringify({
            id: 'custom-forest',
            name: body.name,
          }),
          { status: 200 }
        );
      });

      const result = await registry.callTool('theme_rename', {
        id: 'custom-forest',
        name: 'Emerald Forest',
      });

      expect(result.isError).toBeFalsy();
      expect(result.toolResult.name).toBe('Emerald Forest');
      expect(capturedUrl).toBe('/api/themes/custom-forest/rename');
      expect(capturedOptions?.method).toBe('PUT');
      expect(JSON.parse(capturedOptions.body)).toEqual({ name: 'Emerald Forest' });
    });

    it('validates missing id or name', async () => {
      const result1 = await registry.callTool('theme_rename', { id: '', name: 'Test' });
      expect(result1.isError).toBe(true);
      expect(result1.content[0].text).toContain('Theme ID and new name are required');

      const result2 = await registry.callTool('theme_rename', { id: 'test-id', name: '' });
      expect(result2.isError).toBe(true);
      expect(result2.content[0].text).toContain('Theme ID and new name are required');
    });

    it('handles forbidden error when renaming locked theme', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ message: 'Cannot modify locked built-in theme' }), {
          status: 403,
          statusText: 'Forbidden',
        });
      });

      const result = await registry.callTool('theme_rename', {
        id: 'modern-editorial',
        name: 'New Name',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot modify locked built-in theme');
    });
  });

  describe('theme_delete', () => {
    it('deletes custom theme via DELETE /api/themes/:id', async () => {
      let capturedUrl = '';
      let capturedOptions: any = null;

      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async (url: string, options?: RequestInit) => {
        capturedUrl = url;
        capturedOptions = options;
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      const result = await registry.callTool('theme_delete', { id: 'custom-forest' });
      expect(result.isError).toBeFalsy();
      expect(result.toolResult).toEqual({ success: true });
      expect(capturedUrl).toBe('/api/themes/custom-forest');
      expect(capturedOptions?.method).toBe('DELETE');
    });

    it('validates missing id parameter', async () => {
      const result = await registry.callTool('theme_delete', { id: '' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Theme ID is required');
    });

    it('handles error when deleting active theme', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ message: 'Cannot delete active theme' }), {
          status: 400,
          statusText: 'Bad Request',
        });
      });

      const result = await registry.callTool('theme_delete', { id: 'active-theme' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot delete active theme');
    });
  });
});
