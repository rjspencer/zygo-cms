import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGlobalSubmissionTools } from '../lib/webmcp/submissionTools';
import { WebMCPRegistry } from '../lib/webmcp/registry';
import * as apiModule from '../utils/api';

describe('Global Submission WebMCP Tools (createGlobalSubmissionTools)', () => {
  let registry: WebMCPRegistry;
  let apiFetchSpy: any;

  const mockSubmissions = [
    {
      id: 1,
      form_name: 'contact',
      page_path: '/contact',
      sender_name: 'Jane Doe',
      sender_email: 'jane@example.com',
      subject: 'Inquiry',
      message: 'Hello!',
      metadata_json: null,
      status: 'unread',
      created_at: '2026-10-20T12:00:00Z',
    },
    {
      id: 2,
      form_name: 'newsletter',
      page_path: '/',
      sender_name: null,
      sender_email: 'newsletter@example.com',
      subject: null,
      message: 'Subscribe me',
      metadata_json: null,
      status: 'read',
      created_at: '2026-10-19T10:00:00Z',
    },
  ];

  beforeEach(() => {
    registry = new WebMCPRegistry();
    const tools = createGlobalSubmissionTools();
    registry.registerTools(tools);

    apiFetchSpy = vi.spyOn(apiModule, 'apiFetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers all 4 submission tools', () => {
    const toolNames = registry.getTools().map((t) => t.name);
    expect(toolNames).toContain('list_form_submissions');
    expect(toolNames).toContain('get_form_submission');
    expect(toolNames).toContain('update_form_submission_status');
    expect(toolNames).toContain('delete_form_submission');
  });

  describe('list_form_submissions', () => {
    it('fetches submissions list without parameters by default', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ submissions: mockSubmissions, total: 2 }), { status: 200 })
      );

      const res = await registry.callTool('list_form_submissions', {});
      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual({ submissions: mockSubmissions, total: 2 });
      expect(apiFetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/submissions?'));
    });

    it('passes search, status, and pagination query params correctly', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ submissions: [mockSubmissions[0]], total: 1 }), { status: 200 })
      );

      const res = await registry.callTool('list_form_submissions', {
        status: 'unread',
        form_name: 'contact',
        q: 'Jane',
        page: 2,
        per_page: 10,
      });

      expect(res.isError).toBeFalsy();
      const calledUrl = apiFetchSpy.mock.calls[0][0];
      expect(calledUrl).toContain('status=unread');
      expect(calledUrl).toContain('form_name=contact');
      expect(calledUrl).toContain('q=Jane');
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('per_page=10');
    });

    it('handles API error responses gracefully', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response('Failed to load submissions', { status: 500, statusText: 'Internal Error' })
      );

      const res = await registry.callTool('list_form_submissions', {});
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Failed to fetch submissions');
    });

    it('handles unexpected exceptions gracefully', async () => {
      apiFetchSpy.mockRejectedValueOnce(new Error('Network failure'));

      const res = await registry.callTool('list_form_submissions', {});
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Network failure');
    });
  });

  describe('get_form_submission', () => {
    it('fetches a specific submission by ID', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockSubmissions[0]), { status: 200 })
      );

      const res = await registry.callTool('get_form_submission', { id: 1 });
      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockSubmissions[0]);
      expect(apiFetchSpy).toHaveBeenCalledWith('/api/submissions/1');
    });

    it('validates invalid or missing ID without making network call', async () => {
      const res = await registry.callTool('get_form_submission', { id: 'invalid' });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('A valid numeric "id" is required.');
      expect(apiFetchSpy).not.toHaveBeenCalled();
    });

    it('handles 404 not found error', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response('Submission not found', { status: 404, statusText: 'Not Found' })
      );

      const res = await registry.callTool('get_form_submission', { id: 999 });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Failed to get submission 999');
    });
  });

  describe('update_form_submission_status', () => {
    it('updates submission status to read', async () => {
      const updated = { ...mockSubmissions[0], status: 'read' };
      apiFetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(updated), { status: 200 })
      );

      const res = await registry.callTool('update_form_submission_status', {
        id: 1,
        status: 'read',
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(updated);
      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/submissions/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'read' }),
        })
      );
    });

    it('validates status enum value', async () => {
      const res = await registry.callTool('update_form_submission_status', {
        id: 1,
        status: 'invalid_status',
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Status must be one of "unread", "read", or "archived"');
      expect(apiFetchSpy).not.toHaveBeenCalled();
    });

    it('validates numeric ID on status update', async () => {
      const res = await registry.callTool('update_form_submission_status', {
        id: -5,
        status: 'read',
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('A valid numeric "id" is required.');
      expect(apiFetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('delete_form_submission', () => {
    it('deletes a submission by ID', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, id: 1 }), { status: 200 })
      );

      const res = await registry.callTool('delete_form_submission', { id: 1 });
      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual({ success: true, id: 1 });
      expect(apiFetchSpy).toHaveBeenCalledWith(
        '/api/submissions/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('validates numeric ID on delete', async () => {
      const res = await registry.callTool('delete_form_submission', { id: 0 });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('A valid numeric "id" is required.');
      expect(apiFetchSpy).not.toHaveBeenCalled();
    });

    it('handles delete failure response', async () => {
      apiFetchSpy.mockResolvedValueOnce(
        new Response('Forbidden', { status: 403, statusText: 'Forbidden' })
      );

      const res = await registry.callTool('delete_form_submission', { id: 1 });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Failed to delete submission 1');
    });
  });
});
