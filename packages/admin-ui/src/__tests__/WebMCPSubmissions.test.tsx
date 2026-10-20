import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebMCPRegistry, createGlobalSubmissionTools } from '../lib/webmcp';

describe('WebMCP Submission Tools', () => {
  let registry: WebMCPRegistry;

  beforeEach(() => {
    registry = new WebMCPRegistry();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/submissions/1') && options?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 1,
                status: JSON.parse(options.body as string).status,
              }),
          });
        }
        if (url.includes('/api/submissions/1') && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }
        if (url.includes('/api/submissions/1')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 1,
                form_name: 'contact',
                sender_email: 'test@example.com',
                message: 'Hello!',
                status: 'unread',
              }),
          });
        }
        if (url.includes('/api/submissions')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                submissions: [
                  {
                    id: 1,
                    form_name: 'contact',
                    sender_email: 'test@example.com',
                    message: 'Hello!',
                    status: 'unread',
                  },
                ],
                total: 1,
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );
  });

  it('creates global submission tools with correct schema definitions', () => {
    const tools = createGlobalSubmissionTools();
    expect(tools).toHaveLength(4);
    const names = tools.map((t) => t.name);
    expect(names).toContain('list_form_submissions');
    expect(names).toContain('get_form_submission');
    expect(names).toContain('update_form_submission_status');
    expect(names).toContain('delete_form_submission');
  });

  it('registers all 4 submission tools via registry.registerSubmissionTools', () => {
    const cleanup = registry.registerSubmissionTools();
    expect(registry.getTool('list_form_submissions')).toBeDefined();
    expect(registry.getTool('get_form_submission')).toBeDefined();
    expect(registry.getTool('update_form_submission_status')).toBeDefined();
    expect(registry.getTool('delete_form_submission')).toBeDefined();

    cleanup();
    expect(registry.getTool('list_form_submissions')).toBeUndefined();
  });

  it('executes list_form_submissions tool with query params', async () => {
    registry.registerSubmissionTools();
    const result = await registry.callTool('list_form_submissions', {
      status: 'unread',
      form_name: 'contact',
      q: 'test',
    });

    expect(result.isError).toBeFalsy();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/submissions\?status=unread&form_name=contact&q=test/),
      expect.anything()
    );
  });

  it('executes get_form_submission tool with valid ID', async () => {
    registry.registerSubmissionTools();
    const result = await registry.callTool('get_form_submission', { id: 1 });
    expect(result.isError).toBeFalsy();
    expect(result.toolResult).toHaveProperty('id', 1);
  });

  it('returns error on get_form_submission with invalid ID', async () => {
    registry.registerSubmissionTools();
    const result = await registry.callTool('get_form_submission', { id: -1 });
    expect(result.isError).toBe(true);
  });

  it('executes update_form_submission_status with valid status', async () => {
    registry.registerSubmissionTools();
    const result = await registry.callTool('update_form_submission_status', {
      id: 1,
      status: 'read',
    });
    expect(result.isError).toBeFalsy();
    expect(result.toolResult).toHaveProperty('status', 'read');
  });

  it('rejects update_form_submission_status with invalid status', async () => {
    registry.registerSubmissionTools();
    const result = await registry.callTool('update_form_submission_status', {
      id: 1,
      status: 'invalid_status',
    });
    expect(result.isError).toBe(true);
  });

  it('executes delete_form_submission with numeric ID', async () => {
    registry.registerSubmissionTools();
    const result = await registry.callTool('delete_form_submission', { id: 1 });
    expect(result.isError).toBeFalsy();
    expect(result.toolResult).toHaveProperty('success', true);
  });
});
