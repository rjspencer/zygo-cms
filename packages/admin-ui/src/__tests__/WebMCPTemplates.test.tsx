import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebMCPRegistry } from '../lib/webmcp/registry';
import { WebMCPProvider } from '../providers/WebMCPProvider';
import {
  createGlobalTemplateTools,
  validateMiniJinjaSyntaxAndSchema,
  useTemplateEditorWebMCP,
  renderFallbackMiniJinja,
  type UseTemplateEditorWebMCPOptions,
} from '../lib/webmcp/templateTools';
import { apiFetch } from '../utils/api';
import type { SectionTemplateField } from '../types/sectionTemplate';

vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(),
}));

describe('WebMCP Section Templates (Phase 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Global Template Tools (createGlobalTemplateTools)
  // =========================================================================
  describe('createGlobalTemplateTools()', () => {
    const tools = createGlobalTemplateTools();
    const toolMap = new Map(tools.map((t) => [t.name, t]));

    it('exports all 3 required global tools with valid schemas', () => {
      expect(toolMap.has('list_section_templates')).toBe(true);
      expect(toolMap.has('get_section_template')).toBe(true);
      expect(toolMap.has('delete_section_template')).toBe(true);

      const listTool = toolMap.get('list_section_templates')!;
      expect(listTool.inputSchema.type).toBe('object');

      const getTool = toolMap.get('get_section_template')!;
      expect(getTool.inputSchema.required).toContain('id');

      const deleteTool = toolMap.get('delete_section_template')!;
      expect(deleteTool.inputSchema.required).toContain('id');
    });

    describe('list_section_templates', () => {
      it('returns all templates with locked status and metadata', async () => {
        const mockList = [
          {
            id: 'hero',
            name: 'Hero Section',
            description: 'Hero banner',
            schema_json: '[{"name": "title", "type": "text"}]',
            template_html: '<h1>{{ title }}</h1>',
            template_css: '.hero { color: red; }',
            is_locked: 1,
          },
          {
            id: 'card',
            name: 'Card Section',
            description: 'Card grid',
            schema_json: '[]',
            template_html: '<div class="card"></div>',
            template_css: '.card { padding: 1rem; }',
            is_locked: 0,
          },
        ];

        (apiFetch as any).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockList,
        });

        const listTool = toolMap.get('list_section_templates')!;
        const result = await listTool.handler({});

        expect(apiFetch).toHaveBeenCalledWith('/api/content-types');
        expect(result.isError).toBeFalsy();
        expect(result.toolResult).toEqual(mockList);
        expect(result.content[0].text).toContain('Hero Section');
        expect(result.content[0].text).toContain('Card Section');
      });

      it('falls back to /api/section-templates if /api/content-types fails', async () => {
        const mockList = [{ id: 'fallback-tmpl', name: 'Fallback Template', is_locked: 0 }];

        (apiFetch as any)
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
            json: async () => ({ error: 'Not found' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => mockList,
          });

        const listTool = toolMap.get('list_section_templates')!;
        const result = await listTool.handler({});

        expect(apiFetch).toHaveBeenNthCalledWith(1, '/api/content-types');
        expect(apiFetch).toHaveBeenNthCalledWith(2, '/api/section-templates');
        expect(result.isError).toBeFalsy();
        expect(result.toolResult).toEqual(mockList);
      });

      it('returns error when API fetch fails completely', async () => {
        (apiFetch as any).mockResolvedValue({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Database connection failed' }),
        });

        const listTool = toolMap.get('list_section_templates')!;
        const result = await listTool.handler({});

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Database connection failed');
      });
    });

    describe('get_section_template', () => {
      it('returns error if id argument is missing or invalid', async () => {
        const getTool = toolMap.get('get_section_template')!;

        const resultMissing = await getTool.handler({});
        expect(resultMissing.isError).toBe(true);
        expect(resultMissing.content[0].text).toContain('required');

        const resultEmpty = await getTool.handler({ id: '' });
        expect(resultEmpty.isError).toBe(true);
      });

      it('calls /api/content-types/:id and returns template details', async () => {
        const mockItem = {
          id: 'hero',
          name: 'Hero Section',
          description: 'A hero section',
          template_html: '<h1>{{ title }}</h1>',
          template_css: '.hero { margin: 0; }',
          schema_json: '[{"name": "title", "type": "text"}]',
          is_locked: true,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
        };

        (apiFetch as any).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockItem,
        });

        const getTool = toolMap.get('get_section_template')!;
        const result = await getTool.handler({ id: 'hero' });

        expect(apiFetch).toHaveBeenCalledWith('/api/content-types/hero');
        expect(result.isError).toBeFalsy();
        expect(result.toolResult).toMatchObject({
          id: 'hero',
          name: 'Hero Section',
          is_locked: true,
        });
      });

      it('handles 404 with fallback and returns error if not found', async () => {
        (apiFetch as any).mockResolvedValue({
          ok: false,
          status: 404,
          json: async () => ({ message: 'Not found' }),
        });

        const getTool = toolMap.get('get_section_template')!;
        const result = await getTool.handler({ id: 'missing' });

        expect(result.isError).toBe(true);
        expect(result.content[0].text.toLowerCase()).toContain('not found');
      });
    });

    describe('delete_section_template', () => {
      it('returns error if id argument is missing', async () => {
        const deleteTool = toolMap.get('delete_section_template')!;
        const result = await deleteTool.handler({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('required');
      });

      it('dry_run: true returns preview message without calling DELETE endpoint', async () => {
        const deleteTool = toolMap.get('delete_section_template')!;
        const result = await deleteTool.handler({ id: 'banner', dry_run: true });

        expect(apiFetch).not.toHaveBeenCalled();
        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('[Dry Run] Template "banner" would be deleted.');
        expect(result.toolResult).toMatchObject({
          dry_run: true,
          id: 'banner',
        });
      });

      it('deletes template successfully on DELETE 200 OK', async () => {
        (apiFetch as any).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

        const deleteTool = toolMap.get('delete_section_template')!;
        const result = await deleteTool.handler({ id: 'promo' });

        expect(apiFetch).toHaveBeenCalledWith('/api/content-types/promo', {
          method: 'DELETE',
        });
        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('Template "promo" deleted successfully.');
      });

      it('handles 409 Conflict cleanly with descriptive error message', async () => {
        (apiFetch as any).mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            error: 'Template is currently in use by 4 published entries',
          }),
        });

        const deleteTool = toolMap.get('delete_section_template')!;
        const result = await deleteTool.handler({ id: 'locked-template' });

        expect(result.isError).toBe(true);
        expect(result.toolResult).toMatchObject({ status: 409 });
        expect(result.content[0].text).toContain('Conflict deleting template "locked-template"');
        expect(result.content[0].text).toContain('Template is currently in use by 4 published entries');
      });

      it('handles generic server errors cleanly', async () => {
        (apiFetch as any).mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal server error' }),
        });

        const deleteTool = toolMap.get('delete_section_template')!;
        const result = await deleteTool.handler({ id: 'server-err' });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error deleting template "server-err"');
      });
    });
  });

  // =========================================================================
  // 2. Pure Validator (validateMiniJinjaSyntaxAndSchema)
  // =========================================================================
  describe('validateMiniJinjaSyntaxAndSchema()', () => {
    it('passes for valid schema and matching template markup', () => {
      const templateHtml = `
        <div class="hero">
          <h1>{{ title | default('Welcome') }}</h1>
          {% if subtitle %}
            <h2>{{ subtitle }}</h2>
          {% endif %}
          <ul>
            {% for item in items %}
              <li>{{ loop.index }}: {{ item.label }}</li>
            {% endfor %}
          </ul>
        </div>
      `;
      const schemaJson = JSON.stringify([
        { name: 'title', type: 'text', label: 'Title' },
        { name: 'subtitle', type: 'text', label: 'Subtitle' },
        {
          name: 'items',
          type: 'list',
          label: 'Items',
          fields: [{ name: 'label', type: 'text', label: 'Item Label' }],
        },
      ]);

      const result = validateMiniJinjaSyntaxAndSchema(templateHtml, schemaJson);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('catches unclosed {{ delimiter', () => {
      const templateHtml = '<h1>{{ title </h1>';
      const schemaJson = JSON.stringify([{ name: 'title', type: 'text' }]);

      const result = validateMiniJinjaSyntaxAndSchema(templateHtml, schemaJson);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Unclosed variable tag "{{"'))).toBe(true);
    });

    it('catches unclosed {% for %} tag (missing {% endfor %})', () => {
      const templateHtml = '{% for item in items %}<span>{{ item.text }}</span>';
      const schemaJson = JSON.stringify([
        {
          name: 'items',
          type: 'list',
          fields: [{ name: 'text', type: 'text' }],
        },
      ]);

      const result = validateMiniJinjaSyntaxAndSchema(templateHtml, schemaJson);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Unclosed block "{% for %}"'))).toBe(true);
    });

    it('catches unclosed {% if %} tag (missing {% endif %})', () => {
      const templateHtml = '{% if show_banner %}<div class="banner">Hello</div>';
      const schemaJson = JSON.stringify([{ name: 'show_banner', type: 'boolean' }]);

      const result = validateMiniJinjaSyntaxAndSchema(templateHtml, schemaJson);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Unclosed block "{% if %}"'))).toBe(true);
    });

    it('catches unexpected closing tags {% endfor %} or {% endif %}', () => {
      const result1 = validateMiniJinjaSyntaxAndSchema('<div>{% endfor %}</div>', '[]');
      expect(result1.valid).toBe(false);
      expect(result1.errors.some((e) => e.includes('Unexpected closing tag "{% endfor %}"'))).toBe(true);

      const result2 = validateMiniJinjaSyntaxAndSchema('<div>{% endif %}</div>', '[]');
      expect(result2.valid).toBe(false);
      expect(result2.errors.some((e) => e.includes('Unexpected closing tag "{% endif %}"'))).toBe(true);
    });

    it('catches unknown top-level schema field references', () => {
      const templateHtml = '<div>{{ unknown_title }}</div>';
      const schemaJson = JSON.stringify([{ name: 'real_title', type: 'text' }]);

      const result = validateMiniJinjaSyntaxAndSchema(templateHtml, schemaJson);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes('Unknown variable "unknown_title" referenced in template (not defined in schema)')
        )
      ).toBe(true);
    });

    it('allows built-in identifiers like loop, true, false, and filter names', () => {
      const templateHtml = `
        {% for tag in tags %}
          <span>{{ loop.index }} - {{ tag }}</span>
        {% endfor %}
        {% if true %}
          <p>Visible</p>
        {% endif %}
      `;
      const schemaJson = JSON.stringify([{ name: 'tags', type: 'list', fields: [{ name: 'name', type: 'text' }] }]);

      const result = validateMiniJinjaSyntaxAndSchema(templateHtml, schemaJson);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('catches invalid schema JSON format', () => {
      const result = validateMiniJinjaSyntaxAndSchema('<div>Hello</div>', '{ invalid json }');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid schema JSON syntax'))).toBe(true);
    });

    it('catches schema that is not a JSON array', () => {
      const result = validateMiniJinjaSyntaxAndSchema('<div>Hello</div>', '{"name": "not_an_array"}');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Schema must be a JSON array'))).toBe(true);
    });

    it('catches missing name on schema field', () => {
      const schemaJson = JSON.stringify([{ type: 'text' }]);
      const result = validateMiniJinjaSyntaxAndSchema('<div>Hello</div>', schemaJson);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Field missing required "name" property'))).toBe(true);
    });

    it('catches invalid schema field types', () => {
      const schemaJson = JSON.stringify([{ name: 'broken', type: 'custom_invalid_type' }]);
      const result = validateMiniJinjaSyntaxAndSchema('<div>Hello</div>', schemaJson);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid field type "custom_invalid_type"'))).toBe(true);
    });

    it('validates select field requires non-empty options array', () => {
      const schemaJsonNoOptions = JSON.stringify([{ name: 'category', type: 'select' }]);
      const result1 = validateMiniJinjaSyntaxAndSchema('<div></div>', schemaJsonNoOptions);
      expect(result1.valid).toBe(false);
      expect(result1.errors.some((e) => e.includes('requires non-empty "options" array'))).toBe(true);

      const schemaJsonEmptyOptions = JSON.stringify([{ name: 'category', type: 'select', options: [] }]);
      const result2 = validateMiniJinjaSyntaxAndSchema('<div></div>', schemaJsonEmptyOptions);
      expect(result2.valid).toBe(false);
      expect(result2.errors.some((e) => e.includes('requires non-empty "options" array'))).toBe(true);
    });

    it('validates list field requires fields array and disallows nested lists', () => {
      const schemaJsonNoFields = JSON.stringify([{ name: 'list_field', type: 'list' }]);
      const result1 = validateMiniJinjaSyntaxAndSchema('<div></div>', schemaJsonNoFields);
      expect(result1.valid).toBe(false);
      expect(result1.errors.some((e) => e.includes('requires a "fields" array'))).toBe(true);

      const schemaJsonNested = JSON.stringify([
        {
          name: 'parent_list',
          type: 'list',
          fields: [
            {
              name: 'child_list',
              type: 'list',
              fields: [{ name: 'val', type: 'text' }],
            },
          ],
        },
      ]);
      const result2 = validateMiniJinjaSyntaxAndSchema('<div></div>', schemaJsonNested);
      expect(result2.valid).toBe(false);
      expect(result2.errors.some((e) => e.includes('Nested lists are not allowed'))).toBe(true);
    });
  });

  // =========================================================================
  // 3. Fallback MiniJinja Renderer (renderFallbackMiniJinja)
  // =========================================================================
  describe('renderFallbackMiniJinja()', () => {
    it('interpolates variables, conditional blocks, and for loops with loop.index', () => {
      const templateHtml = `
        <h1>{{ headline }}</h1>
        {% if show_badge %}<span>Active</span>{% endif %}
        <ul>
          {% for item in items %}
            <li>{{ loop.index }}: {{ item.title }}</li>
          {% endfor %}
        </ul>
      `;
      const dummyDataJson = JSON.stringify({
        headline: 'Zygo CMS',
        show_badge: true,
        items: [{ title: 'Item Alpha' }, { title: 'Item Beta' }],
      });

      const rendered = renderFallbackMiniJinja(templateHtml, dummyDataJson);
      expect(rendered).toContain('<h1>Zygo CMS</h1>');
      expect(rendered).toContain('<span>Active</span>');
      expect(rendered).toContain('1: Item Alpha');
      expect(rendered).toContain('2: Item Beta');
    });

    it('returns templateHtml safely on invalid JSON dummy data', () => {
      const raw = '<h1>{{ title }}</h1>';
      const output = renderFallbackMiniJinja(raw, '{ invalid json');
      expect(output).toBe(raw);
    });
  });

  // =========================================================================
  // 4. Hook & Active Template Editor Tools (useTemplateEditorWebMCP)
  // =========================================================================
  describe('useTemplateEditorWebMCP hook tools', () => {
    const TestEditorHarness: React.FC<{
      initialOptions?: Partial<UseTemplateEditorWebMCPOptions>;
      onSetFormTemplateHtml?: (val: string) => void;
      onSetFormTemplateCss?: (val: string) => void;
      onSetFormSchemaJson?: (val: string) => void;
      onSetFields?: (fields: SectionTemplateField[]) => void;
    }> = ({
      initialOptions = {},
      onSetFormTemplateHtml,
      onSetFormTemplateCss,
      onSetFormSchemaJson,
      onSetFields,
    }) => {
      const [formTemplateHtml, setFormTemplateHtml] = React.useState(
        initialOptions.formTemplateHtml ?? '<h1>{{ title }}</h1>'
      );
      const [formTemplateCss, setFormTemplateCss] = React.useState(
        initialOptions.formTemplateCss ?? '.hero { color: red; }'
      );
      const [formSchemaJson, setFormSchemaJson] = React.useState(
        initialOptions.formSchemaJson ?? '[{"name": "title", "type": "text"}]'
      );
      const [fields, setFields] = React.useState<SectionTemplateField[]>(
        initialOptions.setFields ? [] : [{ name: 'title', type: 'text', label: 'Title' }]
      );

      const handleSetHtml = (val: string) => {
        setFormTemplateHtml(val);
        onSetFormTemplateHtml?.(val);
      };

      const handleSetCss = (val: string) => {
        setFormTemplateCss(val);
        onSetFormTemplateCss?.(val);
      };

      const handleSetSchema = (val: string) => {
        setFormSchemaJson(val);
        onSetFormSchemaJson?.(val);
      };

      const handleSetFields = (newFields: SectionTemplateField[]) => {
        setFields(newFields);
        onSetFields?.(newFields);
      };

      useTemplateEditorWebMCP({
        formId: initialOptions.formId ?? 'hero-section',
        formName: initialOptions.formName ?? 'Hero Section',
        formDescription: initialOptions.formDescription ?? 'Hero header banner',
        formTemplateHtml,
        formTemplateCss,
        formSchemaJson,
        isLocked: initialOptions.isLocked ?? false,
        previewHtml: initialOptions.previewHtml ?? '<div class="preview">Live Preview</div>',
        setFormTemplateHtml: handleSetHtml,
        setFormTemplateCss: handleSetCss,
        setFormSchemaJson: handleSetSchema,
        setFields: handleSetFields,
        renderPreview: initialOptions.renderPreview,
      });

      return (
        <div>
          <span data-testid="active-html">{formTemplateHtml}</span>
          <span data-testid="active-css">{formTemplateCss}</span>
          <span data-testid="active-schema">{formSchemaJson}</span>
          <span data-testid="fields-count">{fields.length}</span>
        </div>
      );
    };

    it('registers all 6 editor tools and unregisters them on unmount', () => {
      const registry = new WebMCPRegistry();
      const { unmount } = render(
        <WebMCPProvider registry={registry}>
          <TestEditorHarness />
        </WebMCPProvider>
      );

      expect(registry.getTool('template_get_active')).toBeDefined();
      expect(registry.getTool('template_update_markup')).toBeDefined();
      expect(registry.getTool('template_update_styles')).toBeDefined();
      expect(registry.getTool('template_update_schema')).toBeDefined();
      expect(registry.getTool('template_validate_syntax')).toBeDefined();
      expect(registry.getTool('template_render_preview')).toBeDefined();

      unmount();

      expect(registry.getTool('template_get_active')).toBeUndefined();
      expect(registry.getTool('template_update_markup')).toBeUndefined();
      expect(registry.getTool('template_update_styles')).toBeUndefined();
      expect(registry.getTool('template_update_schema')).toBeUndefined();
      expect(registry.getTool('template_validate_syntax')).toBeUndefined();
      expect(registry.getTool('template_render_preview')).toBeUndefined();
    });

    it('template_get_active returns the full active template buffer', async () => {
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <TestEditorHarness />
        </WebMCPProvider>
      );

      const result = await registry.callTool('template_get_active', {});
      expect(result.isError).toBeFalsy();
      expect(result.toolResult).toEqual({
        id: 'hero-section',
        name: 'Hero Section',
        description: 'Hero header banner',
        template_html: '<h1>{{ title }}</h1>',
        template_css: '.hero { color: red; }',
        schema_json: '[{"name": "title", "type": "text"}]',
        is_locked: false,
        preview_html: '<div class="preview">Live Preview</div>',
      });
    });

    it('template_update_markup updates formTemplateHtml in active editor', async () => {
      const registry = new WebMCPRegistry();
      const onHtml = vi.fn();
      render(
        <WebMCPProvider registry={registry}>
          <TestEditorHarness onSetFormTemplateHtml={onHtml} />
        </WebMCPProvider>
      );

      const newHtml = '<header><h2>{{ title }}</h2></header>';
      const result = await registry.callTool('template_update_markup', {
        template_html: newHtml,
      });

      expect(result.isError).toBeFalsy();
      expect(onHtml).toHaveBeenCalledWith(newHtml);
      await waitFor(() => {
        expect(screen.getByTestId('active-html').textContent).toBe(newHtml);
      });
    });

    it('template_update_styles updates formTemplateCss in active editor', async () => {
      const registry = new WebMCPRegistry();
      const onCss = vi.fn();
      render(
        <WebMCPProvider registry={registry}>
          <TestEditorHarness onSetFormTemplateCss={onCss} />
        </WebMCPProvider>
      );

      const newCss = '.hero { padding: 4rem; background: blue; }';
      const result = await registry.callTool('template_update_styles', {
        template_css: newCss,
      });

      expect(result.isError).toBeFalsy();
      expect(onCss).toHaveBeenCalledWith(newCss);
      await waitFor(() => {
        expect(screen.getByTestId('active-css').textContent).toBe(newCss);
      });
    });

    it('template_update_schema validates and updates formSchemaJson and parsed fields', async () => {
      const registry = new WebMCPRegistry();
      const onSchema = vi.fn();
      const onFields = vi.fn();
      render(
        <WebMCPProvider registry={registry}>
          <TestEditorHarness onSetFormSchemaJson={onSchema} onSetFields={onFields} />
        </WebMCPProvider>
      );

      const validNewSchema = JSON.stringify([
        { name: 'headline', type: 'text', label: 'Headline' },
        { name: 'cta_url', type: 'url', label: 'CTA URL' },
      ]);

      const result = await registry.callTool('template_update_schema', {
        schema_json: validNewSchema,
      });

      expect(result.isError).toBeFalsy();
      expect(onSchema).toHaveBeenCalledWith(validNewSchema);
      expect(onFields).toHaveBeenCalledWith([
        { name: 'headline', type: 'text', label: 'Headline' },
        { name: 'cta_url', type: 'url', label: 'CTA URL' },
      ]);
    });

    it('template_update_schema rejects invalid JSON or invalid schema types', async () => {
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <TestEditorHarness />
        </WebMCPProvider>
      );

      // 1. Syntax Error
      const badJsonResult = await registry.callTool('template_update_schema', {
        schema_json: '{ not json }',
      });
      expect(badJsonResult.isError).toBe(true);
      expect(badJsonResult.content[0].text).toContain('Invalid JSON syntax');

      // 2. Schema field type error
      const badTypeResult = await registry.callTool('template_update_schema', {
        schema_json: JSON.stringify([{ name: 'broken', type: 'unsupported_type' }]),
      });
      expect(badTypeResult.isError).toBe(true);
      expect(badTypeResult.content[0].text).toContain('Schema validation failed');
    });

    it('template_validate_syntax runs validation against active buffer or provided overrides', async () => {
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <TestEditorHarness />
        </WebMCPProvider>
      );

      // Active buffer is valid
      const activeCheck = await registry.callTool('template_validate_syntax', {});
      expect(activeCheck.isError).toBeFalsy();
      expect(activeCheck.content[0].text).toContain('zero errors');

      // Override with syntax error
      const errorCheck = await registry.callTool('template_validate_syntax', {
        template_html: '<h1>{{ unknown_field </h1>',
      });
      expect(errorCheck.isError).toBe(true);
      expect(errorCheck.content[0].text).toContain('Validation failed');
    });

    it('template_render_preview renders HTML with custom dummy data or fallback engine', async () => {
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <TestEditorHarness />
        </WebMCPProvider>
      );

      const renderResult = await registry.callTool('template_render_preview', {
        dummy_data_json: JSON.stringify({ title: 'Preview Headline' }),
      });

      expect(renderResult.isError).toBeFalsy();
      expect(renderResult.content[0].text).toContain('Preview Headline');
    });

    it('template_render_preview invokes custom renderPreview callback when provided', async () => {
      const registry = new WebMCPRegistry();
      const mockRender = vi.fn().mockResolvedValue('<custom-wasm>Rendered Output</custom-wasm>');

      render(
        <WebMCPProvider registry={registry}>
          <TestEditorHarness initialOptions={{ renderPreview: mockRender }} />
        </WebMCPProvider>
      );

      const renderResult = await registry.callTool('template_render_preview', {
        dummy_data_json: JSON.stringify({ title: 'Test' }),
      });

      expect(mockRender).toHaveBeenCalled();
      expect(renderResult.isError).toBeFalsy();
      expect(renderResult.content[0].text).toBe('<custom-wasm>Rendered Output</custom-wasm>');
    });
  });
});
