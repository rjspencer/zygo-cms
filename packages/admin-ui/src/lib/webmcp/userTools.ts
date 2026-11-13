import { apiFetch } from '../../utils/api';
import type { WebMCPToolDefinition, WebMCPToolResult } from './types';

export const VALID_USER_ROLES = ['admin', 'editor', 'author'] as const;
export type ValidUserRole = (typeof VALID_USER_ROLES)[number];

function errorResult(message: string): WebMCPToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
  };
}

function jsonResult(data: unknown): WebMCPToolResult {
  return {
    toolResult: data,
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function normalizeValidRole(role: unknown): { ok: true; value: ValidUserRole } | { ok: false; error: string } {
  if (typeof role !== 'string' || !role.trim()) {
    return {
      ok: false,
      error: `Invalid role: must be one of ${VALID_USER_ROLES.join(', ')}`,
    };
  }
  const normalized = role.trim().toLowerCase();
  if (!(VALID_USER_ROLES as readonly string[]).includes(normalized)) {
    return {
      ok: false,
      error: `Invalid role '${role}'. Must be one of: ${VALID_USER_ROLES.join(', ')}`,
    };
  }
  return { ok: true, value: normalized as ValidUserRole };
}

function parsePositiveUserId(id: unknown): { ok: true; value: number } | { ok: false; error: string } {
  const num = typeof id === 'number' ? id : typeof id === 'string' && id.trim() !== '' ? Number(id) : NaN;
  if (!Number.isInteger(num) || num <= 0) {
    return { ok: false, error: 'A valid positive numeric user "id" is required.' };
  }
  return { ok: true, value: num };
}

async function requestUsersApi(
  url: string,
  errorPrefix: string,
  init?: RequestInit
): Promise<{ ok: true; data: any } | { ok: false; result: WebMCPToolResult }> {
  try {
    const res = await apiFetch(url, init);
    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        result: errorResult(`${errorPrefix}: ${errText || res.statusText}`),
      };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      result: errorResult(`${errorPrefix}: ${msg}`),
    };
  }
}

/**
 * Creates WebMCP tools for User & Role Management in Zygo CMS:
 * - list_users
 * - create_user
 * - update_user
 * - delete_user
 */
export function createGlobalUserTools(): WebMCPToolDefinition[] {
  const listUsersTool: WebMCPToolDefinition = {
    name: 'list_users',
    description: 'List CMS users with optional filtering by role (admin, editor, author) and soft-deleted status',
    inputSchema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: [...VALID_USER_ROLES],
          description: 'Filter users by role (admin, editor, or author)',
        },
        include_deleted: {
          type: 'boolean',
          description: 'Include soft-deleted users in results (defaults to false)',
        },
      },
      additionalProperties: false,
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      let roleFilter: ValidUserRole | undefined;
      if (args.role !== undefined && args.role !== null) {
        const roleCheck = normalizeValidRole(args.role);
        if (!roleCheck.ok) {
          return errorResult(roleCheck.error);
        }
        roleFilter = roleCheck.value;
      }

      const includeDeleted = Boolean(args.include_deleted);
      const response = await requestUsersApi('/api/admin/users', 'Failed to list users');
      if (!response.ok) {
        return response.result;
      }

      const allUsers = Array.isArray(response.data) ? response.data : [];
      const users = allUsers.filter((user: any) => {
        if (!includeDeleted && user?.deleted_at) {
          return false;
        }
        if (roleFilter && user?.role !== roleFilter) {
          return false;
        }
        return true;
      });

      return jsonResult({ users, count: users.length });
    },
  };

  const createUserTool: WebMCPToolDefinition = {
    name: 'create_user',
    description: 'Invite/create a new CMS user with email and role (admin, editor, or author)',
    inputSchema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'User email address (required)',
        },
        display_name: {
          type: 'string',
          description: 'Optional display name (defaults to email prefix)',
        },
        role: {
          type: 'string',
          enum: [...VALID_USER_ROLES],
          description: 'User role (admin, editor, or author; defaults to author)',
        },
        bio: {
          type: 'string',
          description: 'Optional user biography',
        },
        website: {
          type: 'string',
          description: 'Optional personal website URL',
        },
        avatar_url: {
          type: 'string',
          description: 'Optional avatar image URL',
        },
      },
      required: ['email'],
      additionalProperties: false,
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      if (typeof args.email !== 'string' || !args.email.trim()) {
        return errorResult('A non-empty "email" string is required.');
      }

      let resolvedRole: ValidUserRole = 'author';
      if (args.role !== undefined && args.role !== null) {
        const roleCheck = normalizeValidRole(args.role);
        if (!roleCheck.ok) {
          return errorResult(roleCheck.error);
        }
        resolvedRole = roleCheck.value;
      }

      const payload: Record<string, string> = {
        email: args.email.trim(),
        role: resolvedRole,
      };
      if (typeof args.display_name === 'string' && args.display_name.trim()) {
        payload.display_name = args.display_name.trim();
      }
      if (typeof args.bio === 'string' && args.bio.trim()) {
        payload.bio = args.bio.trim();
      }
      if (typeof args.website === 'string' && args.website.trim()) {
        payload.website = args.website.trim();
      }
      if (typeof args.avatar_url === 'string' && args.avatar_url.trim()) {
        payload.avatar_url = args.avatar_url.trim();
      }

      const response = await requestUsersApi('/api/admin/users', 'Failed to create user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        return response.result;
      }

      return jsonResult(response.data);
    },
  };

  const updateUserTool: WebMCPToolDefinition = {
    name: 'update_user',
    description: 'Update an existing CMS user role (admin, editor, author) or profile details',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Numeric ID of the user to update (required)',
        },
        role: {
          type: 'string',
          enum: [...VALID_USER_ROLES],
          description: 'Updated role (admin, editor, or author)',
        },
        display_name: {
          type: 'string',
          description: 'Updated display name (empty string clears it)',
        },
        bio: {
          type: 'string',
          description: 'Updated biography (empty string clears it)',
        },
        website: {
          type: 'string',
          description: 'Updated website URL (empty string clears it)',
        },
        avatar_url: {
          type: 'string',
          description: 'Updated avatar URL (empty string clears it)',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      const idCheck = parsePositiveUserId(args.id);
      if (!idCheck.ok) {
        return errorResult(idCheck.error);
      }

      const payload: Record<string, string> = {};
      if (args.role !== undefined && args.role !== null) {
        const roleCheck = normalizeValidRole(args.role);
        if (!roleCheck.ok) {
          return errorResult(roleCheck.error);
        }
        payload.role = roleCheck.value;
      }

      for (const field of ['display_name', 'bio', 'website', 'avatar_url'] as const) {
        if (args[field] !== undefined) {
          if (typeof args[field] !== 'string') {
            return errorResult(`Field "${field}" must be a string.`);
          }
          payload[field] = args[field];
        }
      }

      if (Object.keys(payload).length === 0) {
        return errorResult('At least one field (role, display_name, bio, website, avatar_url) must be provided to update.');
      }

      const response = await requestUsersApi(`/api/admin/users/${idCheck.value}`, 'Failed to update user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        return response.result;
      }

      return jsonResult(response.data);
    },
  };

  const deleteUserTool: WebMCPToolDefinition = {
    name: 'delete_user',
    description: 'Soft-delete a CMS user by numeric ID with optional dry-run preview',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Numeric ID of the user to delete (required)',
        },
        dry_run: {
          type: 'boolean',
          description: 'If true, previews the target user without deleting (defaults to false)',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      const idCheck = parsePositiveUserId(args.id);
      if (!idCheck.ok) {
        return errorResult(idCheck.error);
      }

      if (args.dry_run === true) {
        const listResponse = await requestUsersApi('/api/admin/users', 'Failed to inspect user for dry run');
        if (!listResponse.ok) {
          return listResponse.result;
        }
        const users = Array.isArray(listResponse.data) ? listResponse.data : [];
        const target = users.find((u: any) => Number(u?.id) === idCheck.value);
        if (!target) {
          return errorResult(`User with ID ${idCheck.value} not found.`);
        }
        return jsonResult({
          dry_run: true,
          action: 'delete_user',
          target_id: idCheck.value,
          user: target,
        });
      }

      const response = await requestUsersApi(`/api/admin/users/${idCheck.value}`, 'Failed to delete user', {
        method: 'DELETE',
      });
      if (!response.ok) {
        return response.result;
      }

      return jsonResult(response.data);
    },
  };

  return [listUsersTool, createUserTool, updateUserTool, deleteUserTool];
}
