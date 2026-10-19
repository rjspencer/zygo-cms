import { apiFetch } from '../../utils/api';
import type { WebMCPToolDefinition, WebMCPToolResult } from './types';

/**
 * Creates global WebMCP tools for URL redirect management in Zygo CMS:
 * - list_redirects
 * - create_redirect
 * - update_redirect
 * - delete_redirect
 */
export function createGlobalRedirectTools(): WebMCPToolDefinition[] {
  const listRedirectsTool: WebMCPToolDefinition = {
    name: 'list_redirects',
    description: 'List URL redirects and vanity marketing URLs with optional filtering by search query',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Optional search term to filter redirects by source path, target destination, or notes',
        },
      },
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      try {
        const res = await apiFetch('/api/redirects');
        if (!res.ok) {
          const errText = await res.text();
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to fetch redirects: ${errText || res.statusText}` }],
          };
        }
        const data = await res.json();
        const redirects: any[] = Array.isArray(data) ? data : data.redirects || [];

        const filtered = redirects.filter((r) => {
          if (args.search) {
            const q = String(args.search).toLowerCase();
            const matchSource = r.source_path && String(r.source_path).toLowerCase().includes(q);
            const matchTarget = r.target_url && String(r.target_url).toLowerCase().includes(q);
            const matchNotes = r.notes && String(r.notes).toLowerCase().includes(q);
            if (!matchSource && !matchTarget && !matchNotes) return false;
          }
          return true;
        });

        return {
          toolResult: filtered,
          content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Error listing redirects: ${msg}` }],
        };
      }
    },
  };

  const createRedirectTool: WebMCPToolDefinition = {
    name: 'create_redirect',
    description: 'Create a new 301 (Permanent) or 302 (Temporary) URL redirect',
    inputSchema: {
      type: 'object',
      properties: {
        source_path: {
          type: 'string',
          description: 'Incoming URL path to intercept (e.g. /spring-sale)',
        },
        target_url: {
          type: 'string',
          description: 'Target destination URL or path (e.g. /pricing or https://example.com)',
        },
        status_code: {
          type: 'number',
          enum: [301, 302],
          description: 'HTTP status code (301 for permanent, 302 for temporary). Defaults to 301.',
        },
        notes: {
          type: 'string',
          description: 'Optional marketing campaign notes or description',
        },
      },
      required: ['source_path', 'target_url'],
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      const rawSource = String(args.source_path || '').trim();
      const rawTarget = String(args.target_url || '').trim();

      if (!rawSource || !rawTarget) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Both "source_path" and "target_url" are required.' }],
        };
      }

      const formattedSource = rawSource.startsWith('/') ? rawSource : `/${rawSource}`;
      if (formattedSource === rawTarget) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Source path and target destination cannot be identical (self-redirect).' }],
        };
      }

      const statusCode = args.status_code === 302 ? 302 : 301;
      const payload: Record<string, any> = {
        source_path: formattedSource,
        target_url: rawTarget,
        status_code: statusCode,
      };

      if (args.notes !== undefined && args.notes !== null) {
        payload.notes = String(args.notes);
      }

      try {
        const res = await apiFetch('/api/redirects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          let errMsg = `Failed to create redirect (${res.status})`;
          try {
            const errData = await res.json();
            errMsg = errData.error || errData.message || errMsg;
          } catch {
            const txt = await res.text();
            if (txt) errMsg = txt;
          }
          return {
            isError: true,
            content: [{ type: 'text', text: errMsg }],
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
          content: [{ type: 'text', text: `Error creating redirect: ${msg}` }],
        };
      }
    },
  };

  const updateRedirectTool: WebMCPToolDefinition = {
    name: 'update_redirect',
    description: 'Update an existing URL redirect by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The unique numeric ID of the redirect to update',
        },
        source_path: {
          type: 'string',
          description: 'Updated incoming URL path (e.g. /new-sale)',
        },
        target_url: {
          type: 'string',
          description: 'Updated target destination URL or path',
        },
        status_code: {
          type: 'number',
          enum: [301, 302],
          description: 'Updated HTTP status code (301 or 302)',
        },
        notes: {
          type: 'string',
          description: 'Updated notes',
        },
      },
      required: ['id'],
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      const id = Number(args.id);
      if (isNaN(id) || id <= 0) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'A valid numeric "id" is required.' }],
        };
      }

      const payload: Record<string, any> = {};

      if (args.source_path !== undefined) {
        const rawSource = String(args.source_path).trim();
        payload.source_path = rawSource.startsWith('/') ? rawSource : `/${rawSource}`;
      }
      if (args.target_url !== undefined) {
        payload.target_url = String(args.target_url).trim();
      }
      if (args.status_code !== undefined) {
        payload.status_code = Number(args.status_code) === 302 ? 302 : 301;
      }
      if (args.notes !== undefined) {
        payload.notes = args.notes === null ? null : String(args.notes);
      }

      try {
        const res = await apiFetch(`/api/redirects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          let errMsg = `Failed to update redirect (${res.status})`;
          try {
            const errData = await res.json();
            errMsg = errData.error || errData.message || errMsg;
          } catch {
            const txt = await res.text();
            if (txt) errMsg = txt;
          }
          return {
            isError: true,
            content: [{ type: 'text', text: errMsg }],
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
          content: [{ type: 'text', text: `Error updating redirect: ${msg}` }],
        };
      }
    },
  };

  const deleteRedirectTool: WebMCPToolDefinition = {
    name: 'delete_redirect',
    description: 'Delete a URL redirect by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The unique numeric ID of the redirect to delete',
        },
      },
      required: ['id'],
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      const id = Number(args.id);
      if (isNaN(id) || id <= 0) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'A valid numeric "id" is required.' }],
        };
      }

      try {
        const res = await apiFetch(`/api/redirects/${id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          let errMsg = `Failed to delete redirect (${res.status})`;
          try {
            const errData = await res.json();
            errMsg = errData.error || errData.message || errMsg;
          } catch {
            const txt = await res.text();
            if (txt) errMsg = txt;
          }
          return {
            isError: true,
            content: [{ type: 'text', text: errMsg }],
          };
        }

        return {
          toolResult: { success: true, id },
          content: [{ type: 'text', text: `Redirect ${id} deleted successfully.` }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Error deleting redirect: ${msg}` }],
        };
      }
    },
  };

  return [listRedirectsTool, createRedirectTool, updateRedirectTool, deleteRedirectTool];
}
