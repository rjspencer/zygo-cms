import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tools, handleCallTool } from '../index.mjs';

describe('Zygo MCP CLI Bridge - Templates Tools', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Definitions', () => {
    it('registers all section template and layout template tools with schemas', () => {
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('zygo_list_section_templates');
      expect(toolNames).toContain('zygo_get_section_template');
      expect(toolNames).toContain('zygo_upsert_section_template');
      expect(toolNames).toContain('zygo_delete_section_template');
      expect(toolNames).toContain('zygo_list_layout_templates');
      expect(toolNames).toContain('zygo_get_layout_template');
      expect(toolNames).toContain('zygo_update_layout_template');

      const listSec = tools.find((t) => t.name === 'zygo_list_section_templates');
      expect(listSec.inputSchema.type).toBe('object');

      const getSec = tools.find((t) => t.name === 'zygo_get_section_template');
      expect(getSec.inputSchema.type).toBe('object');
      expect(getSec.inputSchema.required).toContain('id');

      const upsertSec = tools.find((t) => t.name === 'zygo_upsert_section_template');
      expect(upsertSec.inputSchema.type).toBe('object');
      expect(upsertSec.inputSchema.required).toContain('id');

      const deleteSec = tools.find((t) => t.name === 'zygo_delete_section_template');
      expect(deleteSec.inputSchema.type).toBe('object');
      expect(deleteSec.inputSchema.required).toContain('id');

      const listLayout = tools.find((t) => t.name === 'zygo_list_layout_templates');
      expect(listLayout.inputSchema.type).toBe('object');

      const getLayout = tools.find((t) => t.name === 'zygo_get_layout_template');
      expect(getLayout.inputSchema.type).toBe('object');
      expect(getLayout.inputSchema.required).toContain('id');

      const updateLayout = tools.find((t) => t.name === 'zygo_update_layout_template');
      expect(updateLayout.inputSchema.type).toBe('object');
      expect(updateLayout.inputSchema.required).toContain('id');
    });
  });

  describe('zygo_list_section_templates execution', () => {
    it('calls GET /api/section-templates and returns list of templates', async () => {
      const mockTemplates = [
        { id: 'hero', name: 'Hero Banner', category: 'headers' },
        { id: 'cta', name: 'Call to Action', category: 'conversion' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_list_section_templates',
          arguments: {}
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockTemplates);
      expect(res.content[0].type).toBe('text');
      expect(JSON.parse(res.content[0].text)).toEqual(mockTemplates);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/section-templates'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('handles HTTP error gracefully on listing section templates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_list_section_templates',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('HTTP 500');
    });
  });

  describe('zygo_get_section_template execution', () => {
    it('fetches a section template by ID', async () => {
      const mockTemplate = {
        id: 'hero',
        name: 'Hero Banner',
        template_html: '<section><h1>{{ title }}</h1></section>',
        schema_json: '[{"name":"title","type":"text"}]',
        template_css: '.hero { padding: 4rem; }'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_get_section_template',
          arguments: { id: 'hero' }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockTemplate);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/section-templates/hero'),
        expect.anything()
      );
    });

    it('validates id requirement on get_section_template', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_get_section_template',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Section template not found'
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_get_section_template',
          arguments: { id: 'nonexistent' }
        }
      });

      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('404');
    });
  });

  describe('zygo_upsert_section_template execution', () => {
    it('creates or updates a section template with markup, schema, and styles', async () => {
      const payload = {
        id: 'features-grid',
        name: 'Features Grid',
        template_html: '<section class="features">{% for item in items %}<div>{{ item }}</div>{% endfor %}</section>',
        schema_json: JSON.stringify([{ name: 'items', type: 'list', fields: [{ name: 'title', type: 'text' }] }]),
        template_css: '.features { display: grid; }',
        description: 'Responsive features list',
        category: 'features'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ...payload })
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_upsert_section_template',
          arguments: payload
        }
      });

      expect(res.isError).toBeFalsy();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/section-templates/features-grid'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload)
        })
      );
    });

    it('validates id requirement on upsert_section_template', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_upsert_section_template',
          arguments: { name: 'No ID' }
        }
      });

      expect(res.isError).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('zygo_delete_section_template execution', () => {
    it('sends DELETE request for section template', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'obsolete-template' })
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_delete_section_template',
          arguments: { id: 'obsolete-template' }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual({ success: true, id: 'obsolete-template' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/section-templates/obsolete-template'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('validates id requirement on delete_section_template', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_delete_section_template',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('zygo_list_layout_templates execution', () => {
    it('calls GET /api/layout-templates and returns layout list', async () => {
      const mockLayouts = [
        { id: 'page', name: 'Page Layout', is_locked: false },
        { id: 'post', name: 'Post Layout', is_locked: false },
        { id: 'docs', name: 'Docs Layout', is_locked: true }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayouts
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_list_layout_templates',
          arguments: {}
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockLayouts);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/layout-templates'),
        expect.anything()
      );
    });
  });

  describe('zygo_get_layout_template execution', () => {
    it('fetches layout template details by id', async () => {
      const mockLayout = {
        id: 'page',
        name: 'Page Layout',
        template_html: '<!DOCTYPE html><html><body>{{ content }}</body></html>',
        template_css: 'body { font-family: sans-serif; }'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayout
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_get_layout_template',
          arguments: { id: 'page' }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockLayout);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/layout-templates/page'),
        expect.anything()
      );
    });

    it('validates id requirement on get_layout_template', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_get_layout_template',
          arguments: {}
        }
      });

      expect(res.isError).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('zygo_update_layout_template execution', () => {
    it('sends PUT request to update layout HTML and CSS', async () => {
      const updatedLayout = {
        id: 'page',
        template_html: '<!DOCTYPE html><html><head></head><body><main>{{ content }}</main></body></html>',
        template_css: 'main { max-width: 1200px; margin: 0 auto; }'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ...updatedLayout })
      });

      const res = await handleCallTool({
        params: {
          name: 'zygo_update_layout_template',
          arguments: {
            id: 'page',
            template_html: updatedLayout.template_html,
            template_css: updatedLayout.template_css
          }
        }
      });

      expect(res.isError).toBeFalsy();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/layout-templates/page'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            template_html: updatedLayout.template_html,
            template_css: updatedLayout.template_css
          })
        })
      );
    });

    it('validates id requirement on update_layout_template', async () => {
      const res = await handleCallTool({
        params: {
          name: 'zygo_update_layout_template',
          arguments: { template_html: '<html></html>' }
        }
      });

      expect(res.isError).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
