import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WebMCPRegistry } from '../lib/webmcp/registry';
import { WebMCPProvider } from '../providers/WebMCPProvider';
import { createGlobalEntryTools, useTipTapWebMCP, WorkflowStatus } from '../lib/webmcp/entryTools';

describe('WebMCP Entry Tools - Custom Workflow Statuses', () => {
  const expectedWorkflowStatuses: WorkflowStatus[] = [
    'draft',
    'in_review',
    'ready_for_publish',
    'published',
    'archived',
    'scheduled',
  ];

  describe('Global Entry Tools (createGlobalEntryTools)', () => {
    let registry: WebMCPRegistry;
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      registry = new WebMCPRegistry();
      const tools = createGlobalEntryTools();
      registry.registerTools(tools);

      mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('defines status schema enum with all 6 workflow statuses for list_entries', () => {
      const tool = registry.getTools().find((t) => t.name === 'list_entries');
      expect(tool).toBeDefined();
      expect((tool?.inputSchema.properties as any)?.status?.enum).toEqual(expectedWorkflowStatuses);
    });

    it('defines status schema enum with all 6 workflow statuses for create_entry', () => {
      const tool = registry.getTools().find((t) => t.name === 'create_entry');
      expect(tool).toBeDefined();
      expect((tool?.inputSchema.properties as any)?.status?.enum).toEqual(expectedWorkflowStatuses);
    });

    it('filters entries by custom workflow statuses in list_entries', async () => {
      const mockEntries = [
        { id: '1', title: 'Post 1', slug: 'post-1', type: 'post', status: 'draft' },
        { id: '2', title: 'Post 2', slug: 'post-2', type: 'post', status: 'in_review' },
        { id: '3', title: 'Post 3', slug: 'post-3', type: 'post', status: 'ready_for_publish' },
        { id: '4', title: 'Post 4', slug: 'post-4', type: 'post', status: 'archived' },
      ];

      for (const st of ['in_review', 'ready_for_publish', 'archived']) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockEntries,
        });

        const res = await registry.callTool('list_entries', { status: st });
        expect(res.isError).toBeFalsy();
        const results = res.toolResult as any[];
        expect(results).toHaveLength(1);
        expect(results[0].status).toBe(st);
      }
    });

    it('creates entries with custom workflow statuses in create_entry', async () => {
      for (const st of ['in_review', 'ready_for_publish', 'archived']) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: `entry-${st}`,
            title: `Title ${st}`,
            slug: `slug-${st}`,
            type: 'post',
            status: st,
          }),
        });

        const res = await registry.callTool('create_entry', {
          title: `Title ${st}`,
          slug: `slug-${st}`,
          type: 'post',
          status: st,
        });

        expect(res.isError).toBeFalsy();
        expect(res.toolResult.status).toBe(st);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/entries'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(`"status":"${st}"`),
          })
        );
      }
    });
  });

  describe('Contextual Editor Tools (useTipTapWebMCP)', () => {
    interface TestHarnessProps {
      initialStatus?: WorkflowStatus;
      onStatusChange?: (status: WorkflowStatus) => void;
    }

    const EditorHarness: React.FC<TestHarnessProps> = ({
      initialStatus = 'draft',
      onStatusChange,
    }) => {
      const [title, setTitle] = useState('Test Entry');
      const [slug, setSlug] = useState('test-entry');
      const [status, setStatus] = useState<WorkflowStatus>(initialStatus);

      useTipTapWebMCP({
        editor: null,
        title,
        setTitle,
        slug,
        setSlug,
        status,
        setStatus: (newStatus) => {
          setStatus(newStatus);
          onStatusChange?.(newStatus);
        },
        entryType: 'post',
      });

      return (
        <div>
          <span data-testid="val-title">{title}</span>
          <span data-testid="val-status">{status}</span>
        </div>
      );
    };

    it('defines status schema enum with all 6 workflow statuses for editor_set_metadata', () => {
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness />
        </WebMCPProvider>
      );

      const tool = registry.getTools().find((t) => t.name === 'editor_set_metadata');
      expect(tool).toBeDefined();
      expect((tool?.inputSchema.properties as any)?.status?.enum).toEqual(expectedWorkflowStatuses);
    });

    it('updates status to custom statuses (in_review, ready_for_publish, archived)', async () => {
      const handleStatusChange = vi.fn();
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness onStatusChange={handleStatusChange} />
        </WebMCPProvider>
      );

      for (const st of ['in_review', 'ready_for_publish', 'archived'] as WorkflowStatus[]) {
        const res = await act(async () => {
          return await registry.callTool('editor_set_metadata', {
            status: st,
          });
        });

        expect(res.isError).toBeFalsy();
        expect(res.toolResult.status).toBe(st);
        expect(screen.getByTestId('val-status').textContent).toBe(st);
        expect(handleStatusChange).toHaveBeenCalledWith(st);
      }
    });

    it('rejects invalid workflow status values in editor_set_metadata', async () => {
      const handleStatusChange = vi.fn();
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness initialStatus="draft" onStatusChange={handleStatusChange} />
        </WebMCPProvider>
      );

      const res = await act(async () => {
        return await registry.callTool('editor_set_metadata', {
          status: 'invalid_status_xyz',
        });
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult.status).toBeUndefined();
      expect(screen.getByTestId('val-status').textContent).toBe('draft');
      expect(handleStatusChange).not.toHaveBeenCalled();
    });

    it('returns custom status in editor_get_content', async () => {
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness initialStatus="ready_for_publish" />
        </WebMCPProvider>
      );

      const res = await registry.callTool('editor_get_content', {});
      expect(res.isError).toBeFalsy();
      expect(res.toolResult.status).toBe('ready_for_publish');
    });
  });
});
