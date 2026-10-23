import { apiFetch } from '../../utils/api';
import type { WebMCPToolDefinition, WebMCPToolResult } from './types';

/**
 * Creates global WebMCP tools for Site Backup, Export & Import in Zygo CMS:
 * - export_site_backup
 * - import_site_backup
 */
export function createGlobalBackupTools(): WebMCPToolDefinition[] {
  const exportSiteBackupTool: WebMCPToolDefinition = {
    name: 'export_site_backup',
    description:
      'Export all database-backed site state (settings, menus, templates, entries, redirects, media manifest) into a structured JSON backup bundle',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (): Promise<WebMCPToolResult> => {
      try {
        const res = await apiFetch('/api/admin/export');
        if (!res.ok) {
          const errText = await res.text();
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to export site backup: ${errText || res.statusText}` }],
          };
        }
        const data = await res.json();
        return {
          toolResult: data,
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Error exporting site backup: ${msg}` }],
        };
      }
    },
  };

  const importSiteBackupTool: WebMCPToolDefinition = {
    name: 'import_site_backup',
    description:
      'Import or restore site state from a backup JSON bundle with optional dry-run preview and schema validation',
    inputSchema: {
      type: 'object',
      properties: {
        backup: {
          type: 'object',
          description:
            'The backup JSON object containing settings, menus, section_templates, layout_templates, entries, and redirects',
        },
        dry_run: {
          type: 'boolean',
          description:
            'If true, simulates the import and validates schemas without modifying the database (defaults to false)',
        },
      },
      required: ['backup'],
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      if (!args.backup || typeof args.backup !== 'object') {
        return {
          isError: true,
          content: [{ type: 'text', text: 'A valid "backup" object is required.' }],
        };
      }

      const dryRun = Boolean(args.dry_run);

      try {
        const res = await apiFetch('/api/admin/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            backup: args.backup,
            dry_run: dryRun,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to import site backup: ${errText || res.statusText}` }],
          };
        }

        const data = await res.json();
        return {
          toolResult: data,
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Error importing site backup: ${msg}` }],
        };
      }
    },
  };

  return [exportSiteBackupTool, importSiteBackupTool];
}
