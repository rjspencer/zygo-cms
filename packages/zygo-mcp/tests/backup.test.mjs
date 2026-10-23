import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tools, handleCallTool } from '../index.mjs';

describe('Zygo MCP CLI Bridge - Backup & Portability Tools', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Definitions', () => {
    it('registers zygo_export_site_backup with correct schema', () => {
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('zygo_export_site_backup');

      const exportTool = tools.find((t) => t.name === 'zygo_export_site_backup');
      expect(exportTool.description).toBe(
        'Export the full Zygo CMS site backup as a structured JSON object containing settings, menus, templates, entries, and redirects.'
      );
      expect(exportTool.inputSchema).toEqual({
        type: 'object',
        properties: {}
      });
    });

    it('registers zygo_import_site_backup with correct schema', () => {
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('zygo_import_site_backup');

      const importTool = tools.find((t) => t.name === 'zygo_import_site_backup');
      expect(importTool.description).toBe(
        'Import a Zygo CMS site backup JSON bundle into the CMS, with optional dry-run preview mode.'
      );
      expect(importTool.inputSchema.type).toBe('object');
      expect(importTool.inputSchema.required).toEqual(['backup']);
      expect(importTool.inputSchema.properties.backup).toEqual({
        type: 'object',
        description: 'The site backup JSON object exported from Zygo CMS'
      });
      expect(importTool.inputSchema.properties.dry_run).toEqual({
        type: 'boolean',
        description: 'If true, validates schema and calculates item counts without persisting changes'
      });
      expect(importTool.inputSchema.properties.mode).toEqual({
        type: 'string',
        enum: ['merge', 'overwrite'],
        description: 'Import mode (merge or overwrite)'
      });
    });
  });

  describe('zygo_export_site_backup execution', () => {
    it('calls GET /api/admin/export and returns structured backup', async () => {
      const mockBackup = {
        version: '1.0',
        exported_at: '2026-10-23T12:00:00Z',
        settings: { site_title: 'My Zygo Site' },
        menus: [{ name: 'main', items: [] }],
        section_templates: [],
        layout_templates: [],
        entries: [{ id: '1', title: 'Home', slug: 'home', type: 'page' }],
        redirects: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackup
      });

      const res = await handleCallTool(
        {
          params: {
            name: 'zygo_export_site_backup',
            arguments: {}
          }
        },
        {
          url: 'http://test.local',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          cookie: 'zygo_session=valid-session'
        }
      );

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockBackup);
      expect(res.content[0].type).toBe('text');
      expect(JSON.parse(res.content[0].text)).toEqual(mockBackup);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test.local/api/admin/export',
        expect.objectContaining({
          headers: expect.objectContaining({
            'CF-Access-Client-Id': 'test-client-id',
            'CF-Access-Client-Secret': 'test-client-secret',
            'Content-Type': 'application/json',
            Cookie: 'zygo_session=valid-session'
          })
        })
      );
    });

    it('returns error when export request fails with non-200 HTTP status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden - Admin role required'
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_export_site_backup',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('HTTP 403');
    });
  });

  describe('zygo_import_site_backup execution', () => {
    it('requires backup object parameter', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_import_site_backup',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Backup object is required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('executes dry-run preview mode when dry_run is true', async () => {
      const backupData = {
        version: '1.0',
        exported_at: '2026-10-23T12:00:00Z',
        settings: { site_title: 'Updated Site' },
        menus: [],
        section_templates: [],
        layout_templates: [],
        entries: [{ id: '1', title: 'New Entry', slug: 'new-entry', type: 'post' }],
        redirects: []
      };

      const mockDryRunResponse = {
        dry_run: true,
        valid: true,
        mode: 'merge',
        counts: {
          settings: 1,
          menus: 0,
          section_templates: 0,
          layout_templates: 0,
          entries: 1,
          redirects: 0
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDryRunResponse
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_import_site_backup',
          arguments: {
            backup: backupData,
            dry_run: true,
            mode: 'merge'
          }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockDryRunResponse);
      expect(JSON.parse(res.content[0].text)).toEqual(mockDryRunResponse);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/import'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            backup: backupData,
            dry_run: true,
            mode: 'merge'
          })
        })
      );
    });

    it('defaults dry_run to false when omitted and performs live import', async () => {
      const backupData = {
        version: '1.0',
        exported_at: '2026-10-23T12:00:00Z',
        settings: {},
        menus: [],
        section_templates: [],
        layout_templates: [],
        entries: [],
        redirects: []
      };

      const mockSuccessResponse = {
        success: true,
        dry_run: false,
        mode: 'overwrite',
        imported_counts: {
          settings: 1,
          menus: 2,
          section_templates: 3,
          layout_templates: 1,
          entries: 5,
          redirects: 2
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_import_site_backup',
          arguments: {
            backup: backupData,
            mode: 'overwrite'
          }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockSuccessResponse);

      const parsedBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(parsedBody.dry_run).toBe(false);
      expect(parsedBody.mode).toBe('overwrite');
      expect(parsedBody.backup).toEqual(backupData);
    });

    it('returns error when import endpoint returns non-200 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid backup format: missing version'
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_import_site_backup',
          arguments: {
            backup: { invalid: true }
          }
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('HTTP 400: Invalid backup format');
    });
  });
});
