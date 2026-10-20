import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tools, handleCallTool } from '../index.mjs';

describe('Zygo MCP CLI Bridge - Submissions Tools', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Definitions', () => {
    it('registers all 4 form submission tools with matching schemas', () => {
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('zygo_list_form_submissions');
      expect(toolNames).toContain('zygo_get_form_submission');
      expect(toolNames).toContain('zygo_update_form_submission_status');
      expect(toolNames).toContain('zygo_delete_form_submission');

      const listTool = tools.find((t) => t.name === 'zygo_list_form_submissions');
      expect(listTool.inputSchema.properties.status.enum).toEqual(['unread', 'read', 'archived']);
      expect(listTool.inputSchema.properties.form_name.type).toBe('string');
      expect(listTool.inputSchema.properties.q.type).toBe('string');
      expect(listTool.inputSchema.properties.page.type).toBe('number');
      expect(listTool.inputSchema.properties.per_page.type).toBe('number');

      const getTool = tools.find((t) => t.name === 'zygo_get_form_submission');
      expect(getTool.inputSchema.required).toEqual(['id']);

      const updateTool = tools.find((t) => t.name === 'zygo_update_form_submission_status');
      expect(updateTool.inputSchema.required).toEqual(['id', 'status']);
      expect(updateTool.inputSchema.properties.status.enum).toEqual(['unread', 'read', 'archived']);

      const deleteTool = tools.find((t) => t.name === 'zygo_delete_form_submission');
      expect(deleteTool.inputSchema.required).toEqual(['id']);
    });
  });

  describe('zygo_list_form_submissions execution', () => {
    it('calls /api/submissions without params by default and returns data', async () => {
      const mockData = {
        submissions: [
          { id: 1, sender_email: 'test@example.com', status: 'unread', form_name: 'contact' }
        ],
        total: 1,
        page: 1,
        per_page: 20
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_list_form_submissions',
          arguments: {}
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockData);
      expect(res.content[0].type).toBe('text');
      expect(JSON.parse(res.content[0].text)).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/submissions'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('passes query parameters for status, form_name, q, page, and per_page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ submissions: [], total: 0 })
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_list_form_submissions',
          arguments: {
            status: 'unread',
            form_name: 'contact',
            q: 'john',
            page: 2,
            per_page: 15
          }
        }
      });

      expect(res.isError).toBeFalsy();
      const calledUrl = mockFetch.mock.calls[0][0];
      const parsedUrl = new URL(calledUrl);
      expect(parsedUrl.searchParams.get('status')).toBe('unread');
      expect(parsedUrl.searchParams.get('form_name')).toBe('contact');
      expect(parsedUrl.searchParams.get('q')).toBe('john');
      expect(parsedUrl.searchParams.get('page')).toBe('2');
      expect(parsedUrl.searchParams.get('per_page')).toBe('15');
    });

    it('handles HTTP error gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_list_form_submissions',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('HTTP 500');
    });
  });

  describe('zygo_get_form_submission execution', () => {
    it('fetches specific submission by ID', async () => {
      const mockSubmission = {
        id: 42,
        form_name: 'contact',
        sender_email: 'lead@example.com',
        message: 'Looking for a proposal',
        status: 'unread'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmission
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_get_form_submission',
          arguments: { id: 42 }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockSubmission);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/submissions/42'),
        expect.anything()
      );
    });

    it('validates numeric ID requirement', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_get_form_submission',
          arguments: { id: 0 }
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('A valid numeric id is required');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('zygo_update_form_submission_status execution', () => {
    it('sends PUT request to update status to read', async () => {
      const updatedSubmission = {
        id: 7,
        status: 'read'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedSubmission
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_update_form_submission_status',
          arguments: { id: 7, status: 'read' }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(updatedSubmission);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/submissions/7'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'read' })
        })
      );
    });

    it('rejects invalid status', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_update_form_submission_status',
          arguments: { id: 7, status: 'invalid_status' }
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("Status must be one of 'unread', 'read', or 'archived'");
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('zygo_delete_form_submission execution', () => {
    it('sends DELETE request to delete submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 99 })
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_delete_form_submission',
          arguments: { id: 99 }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual({ success: true, id: 99 });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/submissions/99'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('validates numeric ID on delete', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_delete_form_submission',
          arguments: { id: -1 }
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('A valid numeric id is required');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
