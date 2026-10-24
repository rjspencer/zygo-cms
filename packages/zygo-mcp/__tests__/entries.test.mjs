import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tools, handleCallTool } from '../index.mjs';

describe('Zygo MCP CLI Bridge - Entries Tools', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Definitions', () => {
    it('registers all entry tools with valid schemas', () => {
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('zygo_list_entries');
      expect(toolNames).toContain('zygo_get_entry');
      expect(toolNames).toContain('zygo_create_entry');
      expect(toolNames).toContain('zygo_update_entry');
      expect(toolNames).toContain('zygo_delete_entry');
      expect(toolNames).toContain('zygo_restore_entry');
      expect(toolNames).toContain('zygo_bulk_entries');

      // Backward compatibility tools
      expect(toolNames).toContain('zygo_list_posts');
      expect(toolNames).toContain('zygo_read_post');
      expect(toolNames).toContain('zygo_upsert_post');
    });

    it('defines correct schema for zygo_list_entries', () => {
      const tool = tools.find((t) => t.name === 'zygo_list_entries');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties.type).toBeDefined();
      expect(tool.inputSchema.properties.status).toBeDefined();
    });

    it('defines correct schema for zygo_get_entry', () => {
      const tool = tools.find((t) => t.name === 'zygo_get_entry');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.required).toContain('id');
    });

    it('defines correct schema for zygo_create_entry', () => {
      const tool = tools.find((t) => t.name === 'zygo_create_entry');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.required).toEqual(
        expect.arrayContaining(['title', 'slug', 'type', 'status'])
      );
    });

    it('defines correct schema for zygo_update_entry', () => {
      const tool = tools.find((t) => t.name === 'zygo_update_entry');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.required).toContain('id');
    });

    it('defines correct schema for zygo_delete_entry', () => {
      const tool = tools.find((t) => t.name === 'zygo_delete_entry');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.required).toContain('id');
    });

    it('defines correct schema for zygo_restore_entry', () => {
      const tool = tools.find((t) => t.name === 'zygo_restore_entry');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.required).toContain('id');
    });

    it('defines correct schema for zygo_bulk_entries', () => {
      const tool = tools.find((t) => t.name === 'zygo_bulk_entries');
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.required).toEqual(
        expect.arrayContaining(['action', 'ids'])
      );
    });

    it('defines workflow statuses enum for entries tools', () => {
      const expectedStatuses = ['draft', 'in_review', 'ready_for_publish', 'published', 'archived', 'scheduled'];
      const listTool = tools.find((t) => t.name === 'zygo_list_entries');
      const createTool = tools.find((t) => t.name === 'zygo_create_entry');
      const updateTool = tools.find((t) => t.name === 'zygo_update_entry');

      expect(listTool.inputSchema.properties.status.enum).toEqual(expectedStatuses);
      expect(createTool.inputSchema.properties.status.enum).toEqual(expectedStatuses);
      expect(updateTool.inputSchema.properties.status.enum).toEqual(expectedStatuses);
    });
  });

  describe('zygo_list_entries execution', () => {
    it('calls GET /api/entries without filter and returns entries', async () => {
      const mockEntries = [
        { id: '1', title: 'Home', slug: 'home', type: 'page', status: 'published' },
        { id: '2', title: 'Blog Post', slug: 'blog-post', type: 'post', status: 'draft' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEntries
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_list_entries',
          arguments: {}
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockEntries);
      expect(res.content[0].type).toBe('text');
      expect(JSON.parse(res.content[0].text)).toEqual(mockEntries);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/entries'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('filters entries by type, status, and search query', async () => {
      const mockEntries = [
        { id: '1', title: 'About Page', slug: 'about', type: 'page', status: 'published' },
        { id: '2', title: 'Services Page', slug: 'services', type: 'page', status: 'draft' },
        { id: '3', title: 'About Post', slug: 'about-post', type: 'post', status: 'published' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEntries
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_list_entries',
          arguments: {
            type: 'page',
            status: 'published',
            search: 'about'
          }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toHaveLength(1);
      expect(res.toolResult[0].slug).toBe('about');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/entries'),
        expect.anything()
      );
    });

    it('handles HTTP error on listing entries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_list_entries',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('HTTP 500');
    });
  });

  describe('zygo_get_entry execution', () => {
    it('fetches page entry by slug and parses body_json into sections', async () => {
      const sections = [
        { id: 'sec-1', template_id: 'hero', values: { headline: 'Welcome' } }
      ];
      const mockEntries = [
        {
          id: 'uuid-1',
          title: 'Home Page',
          slug: 'home',
          type: 'page',
          status: 'published',
          body_json: JSON.stringify(sections)
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEntries
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_get_entry',
          arguments: { id: 'home' }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult.slug).toBe('home');
      expect(res.toolResult.sections).toEqual(sections);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/entries'),
        expect.anything()
      );
    });

    it('fetches entry by UUID ID', async () => {
      const mockEntries = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Post Title',
          slug: 'post-title',
          type: 'post',
          status: 'draft',
          body_html: '<p>Content</p>'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEntries
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_get_entry',
          arguments: { id: '123e4567-e89b-12d3-a456-426614174000' }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('throws error when entry is not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_get_entry',
          arguments: { id: 'non-existent' }
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('not found');
    });

    it('validates required id parameter', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_get_entry',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('zygo_create_entry execution', () => {
    it('creates a page entry with serialized sections and empty body_html', async () => {
      const sections = [
        { id: 'hero-1', template_id: 'hero', values: { title: 'Zygo CMS' } }
      ];
      const createdEntry = {
        id: 'new-page-id',
        title: 'New Page',
        slug: 'new-page',
        type: 'page',
        status: 'published',
        body_html: '',
        body_json: JSON.stringify(sections)
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createdEntry
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_create_entry',
          arguments: {
            title: 'New Page',
            slug: 'new-page',
            type: 'page',
            status: 'published',
            sections
          }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(createdEntry);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/entries'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'New Page',
            slug: 'new-page',
            type: 'page',
            status: 'published',
            body_html: '',
            body_json: JSON.stringify(sections),
            description: '',
            category: '',
            tags: ''
          })
        })
      );
    });

    it('creates a post entry with body_html and empty body_json', async () => {
      const createdPost = {
        id: 'new-post-id',
        title: 'New Post',
        slug: 'new-post',
        type: 'post',
        status: 'published',
        body_html: '<p>Post content</p>',
        body_json: '{}'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createdPost
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_create_entry',
          arguments: {
            title: 'New Post',
            slug: 'new-post',
            type: 'post',
            status: 'published',
            body_html: '<p>Post content</p>'
          }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(createdPost);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/entries'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'New Post',
            slug: 'new-post',
            type: 'post',
            status: 'published',
            body_html: '<p>Post content</p>',
            body_json: '{}',
            description: '',
            category: '',
            tags: ''
          })
        })
      );
    });

    it('validates required fields on create', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_create_entry',
          arguments: { title: 'Missing others' }
        }
      });

      expect(res.isError).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('creates an entry with custom workflow statuses (in_review, ready_for_publish, archived)', async () => {
      const statuses = ['in_review', 'ready_for_publish', 'archived'];
      for (const status of statuses) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: `entry-${status}`,
            title: `Post ${status}`,
            slug: `post-${status}`,
            type: 'post',
            status,
            body_html: '<p>Content</p>',
            body_json: '{}'
          })
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_create_entry',
            arguments: {
              title: `Post ${status}`,
              slug: `post-${status}`,
              type: 'post',
              status,
              body_html: '<p>Content</p>'
            }
          }
        });

        expect(res.isError).toBeFalsy();
        expect(res.toolResult.status).toBe(status);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/entries'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(`"status":"${status}"`)
          })
        );
      }
    });
  });

  describe('zygo_update_entry execution', () => {
    it('updates a page entry by id with serialized sections', async () => {
      const sections = [
        { id: 'sec-2', template_id: 'features', values: { items: ['Speed', 'Security'] } }
      ];
      const updatedEntry = {
        id: 'uuid-page',
        title: 'Updated Page',
        slug: 'updated-page',
        type: 'page',
        status: 'published',
        body_json: JSON.stringify(sections)
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedEntry
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_update_entry',
          arguments: {
            id: 'uuid-page',
            title: 'Updated Page',
            slug: 'updated-page',
            type: 'page',
            status: 'published',
            sections
          }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(updatedEntry);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/entries/uuid-page'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining(JSON.stringify(sections))
        })
      );
    });

    it('validates id requirement on update', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_update_entry',
          arguments: { title: 'No ID provided' }
        }
      });

      expect(res.isError).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('updates an entry with custom workflow statuses (in_review, ready_for_publish, archived)', async () => {
      const statuses = ['in_review', 'ready_for_publish', 'archived'];
      for (const status of statuses) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'uuid-1',
            title: 'Updated Post',
            slug: 'updated-post',
            type: 'post',
            status,
            body_html: '<p>Updated content</p>',
            body_json: '{}'
          })
        });

        const res = await handleCallTool({
          params: {
            name: 'zygo_update_entry',
            arguments: {
              id: 'uuid-1',
              title: 'Updated Post',
              status
            }
          }
        });

        expect(res.isError).toBeFalsy();
        expect(res.toolResult.status).toBe(status);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/entries/uuid-1'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining(`"status":"${status}"`)
          })
        );
      }
    });
  });

  describe('zygo_delete_entry execution', () => {
    it('sends DELETE request to soft delete entry', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'entry-99' })
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_delete_entry',
          arguments: { id: 'entry-99' }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual({ success: true, id: 'entry-99' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/entries/entry-99'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('validates id requirement on delete', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_delete_entry',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('zygo_restore_entry execution', () => {
    it('sends POST request to restore soft-deleted entry', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'entry-99', restored: true })
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_restore_entry',
          arguments: { id: 'entry-99' }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual({ success: true, id: 'entry-99', restored: true });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/entries/entry-99/restore'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('validates id requirement on restore', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_restore_entry',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('zygo_bulk_entries execution', () => {
    it('sends POST request to /api/entries/bulk with action and ids', async () => {
      const bulkResult = {
        action: 'publish',
        count: 2,
        success: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => bulkResult
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_bulk_entries',
          arguments: {
            action: 'publish',
            ids: ['id-1', 'id-2']
          }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(bulkResult);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/entries/bulk'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'publish',
            ids: ['id-1', 'id-2']
          })
        })
      );
    });

    it('supports batch trash and add_tags actions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, action: 'trash' })
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_bulk_entries',
          arguments: {
            action: 'trash',
            ids: ['id-3']
          }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/entries/bulk'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'trash',
            ids: ['id-3']
          })
        })
      );
    });

    it('validates required action and ids on bulk action', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_bulk_entries',
          arguments: { action: 'publish' }
        }
      });

      expect(res.isError).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Backward compatibility tools', () => {
    it('zygo_list_posts calls GET /posts (or /api/posts)', async () => {
      const mockPosts = [{ id: '1', title: 'Post 1', slug: 'post-1' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPosts
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_list_posts',
          arguments: {}
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockPosts);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/posts$/),
        expect.anything()
      );
    });

    it('zygo_read_post finds post by slug', async () => {
      const mockPosts = [
        { id: '1', title: 'Post 1', slug: 'post-1' },
        { id: '2', title: 'Post 2', slug: 'post-2' }
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPosts
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_read_post',
          arguments: { slug: 'post-2' }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult.slug).toBe('post-2');
    });

    it('zygo_upsert_post calls POST /entries for create and PUT /entries/:id for update', async () => {
      // Create
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-p', slug: 'p-1' })
      });

      const createRes = await handleCallTool({
        params: {
          name: 'zygo_upsert_post',
          arguments: {
            title: 'P1',
            slug: 'p-1',
            type: 'post',
            status: 'published',
            body_html: '<p>Hi</p>'
          }
        }
      });

      expect(createRes.isError).toBeFalsy();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/entries$/),
        expect.objectContaining({ method: 'POST' })
      );

      // Update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-p', title: 'P1 Updated' })
      });

      const updateRes = await handleCallTool({
        params: {
          name: 'zygo_upsert_post',
          arguments: {
            id: 'new-p',
            title: 'P1 Updated',
            slug: 'p-1',
            type: 'post',
            status: 'published',
            body_html: '<p>Hi Updated</p>'
          }
        }
      });

      expect(updateRes.isError).toBeFalsy();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/entries\/new-p$/),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });
});
