import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebMCPRegistry } from '../lib/webmcp/registry';
import { createGlobalBackupTools } from '../lib/webmcp/backupTools';
import * as apiModule from '../utils/api';

describe('WebMCP Backup & Portability Tools (createGlobalBackupTools)', () => {
  let registry: WebMCPRegistry;
  let apiFetchSpy: any;

  const mockExportPayload = {
    version: '1.0',
    exported_at: '2026-10-23T12:00:00Z',
    settings: {
      site_title: 'Zygo CMS Production',
      canonical_origin: 'https://example.com',
    },
    menus: [
      { id: 1, name: 'Main Navigation', items: [] },
      { id: 2, name: 'Footer Menu', items: [] },
    ],
    section_templates: [
      { id: 'hero', name: 'Hero Banner', template_html: '<h1>{{ title }}</h1>' },
    ],
    layout_templates: [
      { id: 'default', name: 'Default Layout', template_html: '<main>{{ content }}</main>' },
    ],
    entries: [
      { id: 1, title: 'Home', slug: '/', status: 'published' },
      { id: 2, title: 'About Us', slug: '/about', status: 'published' },
    ],
    redirects: [
      { id: 1, source_path: '/old-about', target_url: '/about', status_code: 301 },
    ],
    media_manifest: [
      {
        key: 'hero.webp',
        filename: 'hero.webp',
        mime_type: 'image/webp',
        size_bytes: 142000,
        url: '/media/hero.webp',
      },
    ],
  };

  const mockDryRunCounts = {
    settings: 2,
    menus: 2,
    section_templates: 1,
    layout_templates: 1,
    templates: 2,
    entries: 2,
    redirects: 1,
    media: 1,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    registry = new WebMCPRegistry();
    const tools = createGlobalBackupTools();
    registry.registerTools(tools);

    apiFetchSpy = vi.spyOn(apiModule, 'apiFetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers export_site_backup and import_site_backup tools on WebMCPRegistry', () => {
    const toolNames = registry.getTools().map((t) => t.name);
    expect(toolNames).toContain('export_site_backup');
    expect(toolNames).toContain('import_site_backup');
  });

  describe('export_site_backup', () => {
    it('calls GET /api/admin/export and returns the expected site archive payload', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockExportPayload), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="zygo-backup-2026-10-23.json"',
          },
        })
      );

      const result = await registry.callTool('export_site_backup', {});

      expect(result.isError).toBeFalsy();
      expect(
        apiFetchSpy.mock.calls.some((c: any[]) => String(c[0]).includes('/api/admin/export'))
      ).toBe(true);
      expect(result.toolResult).toEqual(mockExportPayload);
      expect(result.toolResult.version).toBe('1.0');
      expect(result.toolResult.entries).toHaveLength(2);
      expect(result.toolResult.menus).toHaveLength(2);
    });

    it('handles export API failure gracefully by returning isError: true', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response('Internal server error exporting backup', {
          status: 500,
          statusText: 'Internal Server Error',
        })
      );

      const result = await registry.callTool('export_site_backup', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/export|failed|500/i);
    });
  });

  describe('import_site_backup', () => {
    it('calls POST /api/admin/import with dry_run: true and returns item counts', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            dry_run: true,
            counts: mockDryRunCounts,
            warnings: ['Duplicate slug resolved for /about'],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const result = await registry.callTool('import_site_backup', {
        backup: mockExportPayload,
        dry_run: true,
      });

      expect(result.isError).toBeFalsy();
      expect(apiFetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/import'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"dry_run":true'),
        })
      );

      const toolResult = result.toolResult;
      expect(toolResult.dry_run).toBe(true);
      expect(toolResult.counts).toEqual(mockDryRunCounts);
      expect(toolResult.counts.entries).toBe(2);
      expect(toolResult.counts.menus).toBe(2);
    });

    it('calls POST /api/admin/import with dry_run: false to commit site restoration', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            dry_run: false,
            counts: mockDryRunCounts,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const result = await registry.callTool('import_site_backup', {
        backup: mockExportPayload,
        dry_run: false,
      });

      expect(result.isError).toBeFalsy();
      expect(apiFetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/import'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"dry_run":false'),
        })
      );
      expect(result.toolResult.success).toBe(true);
      expect(result.toolResult.dry_run).toBe(false);
    });

    it('handles import validation failure gracefully by returning isError: true', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 'Template validation error: unexpected tag endblock in hero.html',
          }),
          { status: 400, statusText: 'Bad Request' }
        )
      );

      const result = await registry.callTool('import_site_backup', {
        backup: { ...mockExportPayload, section_templates: [{ id: 'hero', template_html: '{% bad %}' }] },
        dry_run: true,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/template validation|error|bad request/i);
    });
  });
});
