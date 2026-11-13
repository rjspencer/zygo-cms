import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tools, handleCallTool } from '../index.mjs';

describe('Zygo MCP CLI Bridge - User Management Tools', () => {
  let mockFetch;

  const mockUsers = [
    { id: 1, email: 'admin@example.com', display_name: 'Admin', role: 'admin', deleted_at: null },
    { id: 2, email: 'editor@example.com', display_name: 'Editor', role: 'editor', deleted_at: null },
    { id: 3, email: 'author@example.com', display_name: 'Author', role: 'author', deleted_at: null },
    { id: 4, email: 'deleted@example.com', display_name: 'Removed', role: 'author', deleted_at: '2026-02-01T00:00:00Z' }
  ];

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Definitions', () => {
    it('exposes user management tools with strict input schemas', () => {
      const names = tools.map((t) => t.name);
      expect(names).toEqual(
        expect.arrayContaining(['zygo_list_users', 'zygo_create_user', 'zygo_update_user', 'zygo_delete_user'])
      );

      for (const name of ['zygo_list_users', 'zygo_create_user', 'zygo_update_user']) {
        const tool = tools.find((t) => t.name === name);
        expect(tool.inputSchema.additionalProperties).toBe(false);
        expect(tool.inputSchema.properties.role.enum).toEqual(['admin', 'editor', 'author']);
      }

      const deleteTool = tools.find((t) => t.name === 'zygo_delete_user');
      expect(deleteTool.inputSchema.required).toEqual(['id']);
      expect(deleteTool.inputSchema.additionalProperties).toBe(false);
    });
  });

  describe('zygo_list_users', () => {
    it('filters active users and supports role="editor" filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers
      });

      const res = await handleCallTool({
        params: { name: 'zygo_list_users', arguments: { role: 'editor' } }
      });

      expect(res.isError).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/admin\/users$/),
        expect.any(Object)
      );
      expect(res.toolResult.count).toBe(1);
      expect(res.toolResult.users[0].role).toBe('editor');
    });

    it('includes soft-deleted users when include_deleted is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers
      });

      const res = await handleCallTool({
        params: { name: 'zygo_list_users', arguments: { include_deleted: true } }
      });

      expect(res.isError).toBeUndefined();
      expect(res.toolResult.count).toBe(4);
    });

    it('rejects invalid roles with isError: true', async () => {
      const res = await handleCallTool({
        params: { name: 'zygo_list_users', arguments: { role: 'owner' } }
      });
      expect(res.isError).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('zygo_create_user', () => {
    it('creates an editor user and defaults omitted role to author', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 5, email: 'ed@example.com', role: 'editor' })
      });

      const editorRes = await handleCallTool({
        params: {
          name: 'zygo_create_user',
          arguments: { email: 'ed@example.com', role: 'editor', display_name: 'Ed' }
        }
      });

      expect(editorRes.isError).toBeUndefined();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toMatch(/\/api\/admin\/users$/);
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({
        email: 'ed@example.com',
        role: 'editor',
        display_name: 'Ed'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 6, email: 'au@example.com', role: 'author' })
      });

      await handleCallTool({
        params: {
          name: 'zygo_create_user',
          arguments: { email: 'au@example.com' }
        }
      });

      const [, defaultInit] = mockFetch.mock.calls[1];
      expect(JSON.parse(defaultInit.body).role).toBe('author');
    });

    it('rejects invalid role or blank email without calling API', async () => {
      const badRole = await handleCallTool({
        params: { name: 'zygo_create_user', arguments: { email: 'x@example.com', role: 'superuser' } }
      });
      expect(badRole.isError).toBe(true);

      const badEmail = await handleCallTool({
        params: { name: 'zygo_create_user', arguments: { email: '  ' } }
      });
      expect(badEmail.isError).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('zygo_update_user', () => {
    it('updates a user role to editor via PUT /api/admin/users/:id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 3, email: 'author@example.com', role: 'editor' })
      });

      const res = await handleCallTool({
        params: { name: 'zygo_update_user', arguments: { id: 3, role: 'editor' } }
      });

      expect(res.isError).toBeUndefined();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toMatch(/\/api\/admin\/users\/3$/);
      expect(init.method).toBe('PUT');
      expect(JSON.parse(init.body)).toEqual({ role: 'editor' });
    });

    it('rejects invalid input before making network requests', async () => {
      const noFields = await handleCallTool({
        params: { name: 'zygo_update_user', arguments: { id: 3 } }
      });
      expect(noFields.isError).toBe(true);

      const badRole = await handleCallTool({
        params: { name: 'zygo_update_user', arguments: { id: 3, role: 'reviewer' } }
      });
      expect(badRole.isError).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('zygo_delete_user', () => {
    it('supports dry_run preview without issuing DELETE', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers
      });

      const res = await handleCallTool({
        params: { name: 'zygo_delete_user', arguments: { id: 2, dry_run: true } }
      });

      expect(res.isError).toBeUndefined();
      expect(res.toolResult.dry_run).toBe(true);
      expect(res.toolResult.user.email).toBe('editor@example.com');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('issues DELETE /api/admin/users/:id when dry_run is not set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const res = await handleCallTool({
        params: { name: 'zygo_delete_user', arguments: { id: 2 } }
      });

      expect(res.isError).toBeUndefined();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toMatch(/\/api\/admin\/users\/2$/);
      expect(init.method).toBe('DELETE');
    });
  });
});
