import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebMCPRegistry } from '../lib/webmcp/registry';
import { createGlobalUserTools, VALID_USER_ROLES } from '../lib/webmcp/userTools';
import * as apiModule from '../utils/api';

describe('WebMCP User & Role Management Tools (createGlobalUserTools)', () => {
  let registry: WebMCPRegistry;
  let apiFetchSpy: any;

  const mockUsers = [
    {
      id: 1,
      auth_provider_id: 'auth-1',
      email: 'admin@example.com',
      display_name: 'Admin User',
      role: 'admin',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      deleted_at: null,
    },
    {
      id: 2,
      auth_provider_id: 'auth-2',
      email: 'editor@example.com',
      display_name: 'Chief Editor',
      role: 'editor',
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      deleted_at: null,
    },
    {
      id: 3,
      auth_provider_id: 'auth-3',
      email: 'author@example.com',
      display_name: 'Staff Author',
      role: 'author',
      created_at: '2026-01-03T00:00:00Z',
      updated_at: '2026-01-03T00:00:00Z',
      deleted_at: null,
    },
    {
      id: 4,
      auth_provider_id: 'auth-4',
      email: 'former@example.com',
      display_name: 'Deleted Author',
      role: 'author',
      created_at: '2026-01-04T00:00:00Z',
      updated_at: '2026-01-04T00:00:00Z',
      deleted_at: '2026-02-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    registry = new WebMCPRegistry();
    registry.registerUserTools();
    apiFetchSpy = vi.spyOn(apiModule, 'apiFetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers all user management tools with strict role schemas', () => {
    const tools = registry.getTools();
    const names = tools.map((t) => t.name);

    expect(names).toEqual(
      expect.arrayContaining(['list_users', 'create_user', 'update_user', 'delete_user'])
    );

    expect(VALID_USER_ROLES).toEqual(['admin', 'editor', 'author']);

    const listTool = registry.getTool('list_users');
    expect(listTool?.inputSchema.additionalProperties).toBe(false);
    expect((listTool?.inputSchema.properties?.role as any)?.enum).toEqual(['admin', 'editor', 'author']);

    const createTool = registry.getTool('create_user');
    expect(createTool?.inputSchema.required).toEqual(['email']);
    expect(createTool?.inputSchema.additionalProperties).toBe(false);
    expect((createTool?.inputSchema.properties?.role as any)?.enum).toEqual(['admin', 'editor', 'author']);

    const updateTool = registry.getTool('update_user');
    expect(updateTool?.inputSchema.required).toEqual(['id']);
    expect(updateTool?.inputSchema.additionalProperties).toBe(false);
    expect((updateTool?.inputSchema.properties?.role as any)?.enum).toEqual(['admin', 'editor', 'author']);

    const deleteTool = registry.getTool('delete_user');
    expect(deleteTool?.inputSchema.required).toEqual(['id']);
    expect(deleteTool?.inputSchema.additionalProperties).toBe(false);
  });

  describe('list_users', () => {
    it('excludes soft-deleted users by default and supports filtering by editor role', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockUsers), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const defaultRes = await registry.callTool('list_users', {});
      expect(defaultRes.isError).toBeFalsy();
      expect((defaultRes.toolResult as any).count).toBe(3);

      apiFetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockUsers), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const editorRes = await registry.callTool('list_users', { role: 'editor' });
      expect(editorRes.isError).toBeFalsy();
      expect((editorRes.toolResult as any).count).toBe(1);
      expect((editorRes.toolResult as any).users[0].email).toBe('editor@example.com');
    });

    it('includes soft-deleted users when include_deleted is true', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockUsers), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await registry.callTool('list_users', { include_deleted: true });
      expect(res.isError).toBeFalsy();
      expect((res.toolResult as any).count).toBe(4);
    });

    it('rejects invalid role filter without calling API', async () => {
      const res = await registry.callTool('list_users', { role: 'superadmin' });
      expect(res.isError).toBe(true);
      expect(apiFetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('create_user', () => {
    it('creates an editor user via POST /api/admin/users', async () => {
      const createdUser = {
        id: 5,
        email: 'new-editor@example.com',
        display_name: 'New Editor',
        role: 'editor',
      };
      apiFetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(createdUser), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await registry.callTool('create_user', {
        email: 'new-editor@example.com',
        display_name: 'New Editor',
        role: 'editor',
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(createdUser);
      const [url, init] = apiFetchSpy.mock.calls[0];
      expect(url).toBe('/api/admin/users');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({
        email: 'new-editor@example.com',
        display_name: 'New Editor',
        role: 'editor',
      });
    });

    it('defaults role to author when omitted', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 6, email: 'writer@example.com', role: 'author' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await registry.callTool('create_user', { email: 'writer@example.com' });
      expect(res.isError).toBeFalsy();
      const [, init] = apiFetchSpy.mock.calls[0];
      expect(JSON.parse(init.body).role).toBe('author');
    });

    it('rejects empty email or invalid role', async () => {
      const badEmail = await registry.callTool('create_user', { email: '  ', role: 'editor' });
      expect(badEmail.isError).toBe(true);

      const badRole = await registry.callTool('create_user', {
        email: 'user@example.com',
        role: 'publisher',
      });
      expect(badRole.isError).toBe(true);
      expect(apiFetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('update_user', () => {
    it('promotes an author to editor via PUT /api/admin/users/:id', async () => {
      const updated = { ...mockUsers[2], role: 'editor' };
      apiFetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(updated), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await registry.callTool('update_user', { id: 3, role: 'editor' });
      expect(res.isError).toBeFalsy();
      expect((res.toolResult as any).role).toBe('editor');

      const [url, init] = apiFetchSpy.mock.calls[0];
      expect(url).toBe('/api/admin/users/3');
      expect(init.method).toBe('PUT');
      expect(JSON.parse(init.body)).toEqual({ role: 'editor' });
    });

    it('rejects invalid id, empty updates, and invalid roles', async () => {
      expect((await registry.callTool('update_user', { id: 0, role: 'editor' })).isError).toBe(true);
      expect((await registry.callTool('update_user', { id: 3 })).isError).toBe(true);
      expect((await registry.callTool('update_user', { id: 3, role: 'invalid' })).isError).toBe(true);
      expect(apiFetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('delete_user', () => {
    it('previews target user without deleting when dry_run is true', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockUsers), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await registry.callTool('delete_user', { id: 2, dry_run: true });
      expect(res.isError).toBeFalsy();
      expect((res.toolResult as any).dry_run).toBe(true);
      expect((res.toolResult as any).user.email).toBe('editor@example.com');
      expect(apiFetchSpy).toHaveBeenCalledTimes(1);
      expect(apiFetchSpy.mock.calls[0][1]?.method).toBeUndefined();
    });

    it('deletes user via DELETE /api/admin/users/:id', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await registry.callTool('delete_user', { id: 2 });
      expect(res.isError).toBeFalsy();
      const [url, init] = apiFetchSpy.mock.calls[0];
      expect(url).toBe('/api/admin/users/2');
      expect(init.method).toBe('DELETE');
    });

    it('surfaces HTTP errors gracefully', async () => {
      apiFetchSpy.mockResolvedValueOnce(new Response('Cannot delete yourself', { status: 400 }));
      const tools = createGlobalUserTools();
      expect(tools).toHaveLength(4);

      const res = await registry.callTool('delete_user', { id: 1 });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Cannot delete yourself');
    });
  });
});
