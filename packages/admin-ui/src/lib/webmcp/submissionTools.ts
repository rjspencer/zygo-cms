import { apiFetch } from '../../utils/api';
import type { WebMCPToolDefinition, WebMCPToolResult } from './types';

/**
 * Creates global WebMCP tools for Form Submissions management in Zygo CMS:
 * - list_form_submissions
 * - get_form_submission
 * - update_form_submission_status
 * - delete_form_submission
 */
export function createGlobalSubmissionTools(): WebMCPToolDefinition[] {
  const listFormSubmissionsTool: WebMCPToolDefinition = {
    name: 'list_form_submissions',
    description: 'List contact and newsletter form submissions with optional filtering by status, form name, or search query',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['unread', 'read', 'archived'],
          description: 'Optional status filter ("unread", "read", "archived")',
        },
        form_name: {
          type: 'string',
          description: 'Optional form name to filter by (e.g. "contact", "newsletter")',
        },
        q: {
          type: 'string',
          description: 'Optional search query to match against sender name, email, subject, or message content',
        },
        page: {
          type: 'number',
          description: 'Page number (default: 1)',
        },
        per_page: {
          type: 'number',
          description: 'Number of results per page (default: 20)',
        },
      },
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      try {
        const params = new URLSearchParams();
        if (args.status) params.set('status', String(args.status));
        if (args.form_name) params.set('form_name', String(args.form_name));
        if (args.q) params.set('q', String(args.q));
        if (args.page != null) params.set('page', String(args.page));
        if (args.per_page != null) params.set('per_page', String(args.per_page));

        const res = await apiFetch(`/api/submissions?${params.toString()}`);
        if (!res.ok) {
          const errText = await res.text();
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to fetch submissions: ${errText || res.statusText}` }],
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
          content: [{ type: 'text', text: `Error listing form submissions: ${msg}` }],
        };
      }
    },
  };

  const getFormSubmissionTool: WebMCPToolDefinition = {
    name: 'get_form_submission',
    description: 'Get full details of a specific form submission by numeric ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The numeric ID of the form submission',
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
        const res = await apiFetch(`/api/submissions/${id}`);
        if (!res.ok) {
          const errText = await res.text();
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to get submission ${id}: ${errText || res.statusText}` }],
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
          content: [{ type: 'text', text: `Error getting form submission ${id}: ${msg}` }],
        };
      }
    },
  };

  const updateFormSubmissionStatusTool: WebMCPToolDefinition = {
    name: 'update_form_submission_status',
    description: 'Update the status of a form submission ("unread", "read", or "archived")',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The numeric ID of the form submission',
        },
        status: {
          type: 'string',
          enum: ['unread', 'read', 'archived'],
          description: 'New status for the submission ("unread", "read", or "archived")',
        },
      },
      required: ['id', 'status'],
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      const id = Number(args.id);
      const status = String(args.status || '');
      if (isNaN(id) || id <= 0) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'A valid numeric "id" is required.' }],
        };
      }
      if (!['unread', 'read', 'archived'].includes(status)) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Status must be one of "unread", "read", or "archived".' }],
        };
      }

      try {
        const res = await apiFetch(`/api/submissions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to update submission status: ${errText || res.statusText}` }],
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
          content: [{ type: 'text', text: `Error updating form submission status: ${msg}` }],
        };
      }
    },
  };

  const deleteFormSubmissionTool: WebMCPToolDefinition = {
    name: 'delete_form_submission',
    description: 'Permanently delete a form submission by numeric ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'The numeric ID of the form submission to delete',
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
        const res = await apiFetch(`/api/submissions/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const errText = await res.text();
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to delete submission ${id}: ${errText || res.statusText}` }],
          };
        }
        return {
          toolResult: { success: true, id },
          content: [{ type: 'text', text: `Form submission #${id} deleted successfully.` }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Error deleting form submission: ${msg}` }],
        };
      }
    },
  };

  return [
    listFormSubmissionsTool,
    getFormSubmissionTool,
    updateFormSubmissionStatusTool,
    deleteFormSubmissionTool,
  ];
}
