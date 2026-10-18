import React from 'react';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { apiFetch } from '../../utils/api';
import { useRegisterWebMCPTools } from '../../providers/WebMCPProvider';
import type { WebMCPToolDefinition, WebMCPToolResult } from './types';
import type { SectionInstance, SectionTemplate } from '../../types/sectionTemplate';

export interface UseTipTapWebMCPOptions {
  editor: TipTapEditor | null;
  getFormValues?: () => Record<string, any>;
  content?: string;
  setContent?: (content: string) => void;
  title?: string;
  setTitle?: (title: string) => void;
  slug?: string;
  setSlug?: (slug: string) => void;
  status?: 'draft' | 'published' | 'scheduled';
  setStatus?: (status: 'draft' | 'published' | 'scheduled') => void;
  entryType: string;
  description?: string;
  setDescription?: (description: string) => void;
  category?: string;
  setCategory?: (category: string) => void;
  tags?: string;
  setTags?: (tags: string) => void;
  sections?: SectionInstance[];
  setSections?: (sections: SectionInstance[]) => void;
  sectionTemplates?: SectionTemplate[];
  onExpandSection?: (index: number) => void;
  coverImage?: string;
  setCoverImage?: (coverImage: string) => void;
  canonicalUrl?: string;
  setCanonicalUrl?: (canonicalUrl: string) => void;
  schemaJson?: string;
  setSchemaJson?: (schemaJson: string) => void;
  parentId?: string;
  setParentId?: (parentId: string) => void;
  sortOrder?: number;
  setSortOrder?: (sortOrder: number) => void;
  onSaveDraft?: () => Promise<any> | any;
  onPublish?: () => Promise<any> | any;
}

/**
 * Creates global WebMCP tools for entry management across the Zygo CMS admin dashboard.
 */
export function createGlobalEntryTools(): WebMCPToolDefinition[] {
  const listEntriesTool: WebMCPToolDefinition = {
    name: 'list_entries',
    description: 'List posts, pages, or docs from Zygo CMS with optional filtering by type, status, or search query',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['post', 'page', 'doc'],
          description: 'Filter entries by type (post, page, doc)',
        },
        status: {
          type: 'string',
          enum: ['draft', 'published', 'scheduled'],
          description: 'Filter entries by status (draft, published, scheduled)',
        },
        search: {
          type: 'string',
          description: 'Search entries matching title or slug',
        },
      },
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      try {
        const res = await apiFetch('/api/entries');
        if (!res.ok) {
          const errText = await res.text();
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to fetch entries: ${errText || res.statusText}` }],
          };
        }
        const data = await res.json();
        const entries: any[] = Array.isArray(data) ? data : (data.entries || []);
        const filtered = entries.filter((entry) => {
          if (args.type && entry.type !== args.type) return false;
          if (args.status && entry.status !== args.status) return false;
          if (args.search) {
            const query = String(args.search).toLowerCase();
            const matchTitle = entry.title && String(entry.title).toLowerCase().includes(query);
            const matchSlug = entry.slug && String(entry.slug).toLowerCase().includes(query);
            if (!matchTitle && !matchSlug) return false;
          }
          return true;
        });

        return {
          toolResult: filtered,
          content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Error listing entries: ${msg}` }],
        };
      }
    },
  };

  const getEntryTool: WebMCPToolDefinition = {
    name: 'get_entry',
    description: 'Get details of a specific entry by its ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The unique ID of the entry',
        },
      },
      required: ['id'],
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      const id = String(args.id || '').trim();
      if (!id) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Entry ID is required.' }],
        };
      }
      try {
        const res = await apiFetch(`/api/entries/${id}`);
        if (!res.ok) {
          const errText = await res.text();
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to get entry ${id}: ${errText || res.statusText}` }],
          };
        }
        const data = await res.json();
        return {
          toolResult: data,
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting entry: ${msg}` }],
        };
      }
    },
  };

  const createEntryTool: WebMCPToolDefinition = {
    name: 'create_entry',
    description: 'Create a new post, page, or doc entry',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the entry',
        },
        slug: {
          type: 'string',
          description: 'URL-friendly slug',
        },
        type: {
          type: 'string',
          enum: ['post', 'page', 'doc'],
          description: 'Type of entry (post, page, or doc)',
        },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
          description: 'Publication status (draft or published)',
        },
        body_html: {
          type: 'string',
          description: 'HTML body content',
        },
        description: {
          type: 'string',
          description: 'Meta description',
        },
        category: {
          type: 'string',
          description: 'Category name',
        },
        tags: {
          type: 'string',
          description: 'Comma-separated tags',
        },
      },
      required: ['title', 'slug', 'type'],
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      if (!args.title || !args.slug || !args.type) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Fields "title", "slug", and "type" are required.' }],
        };
      }
      try {
        const payload = {
          title: String(args.title),
          slug: String(args.slug),
          type: String(args.type),
          status: args.status || 'draft',
          body_html: args.body_html || '',
          description: args.description || '',
          category: args.category || '',
          tags: args.tags || '',
        };
        const res = await apiFetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errText = await res.text();
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to create entry: ${errText || res.statusText}` }],
          };
        }
        const data = await res.json();
        return {
          toolResult: data,
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Error creating entry: ${msg}` }],
        };
      }
    },
  };

  const deleteEntryTool: WebMCPToolDefinition = {
    name: 'delete_entry',
    description: 'Delete an entry by ID, with optional dry_run preview',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Entry ID to delete',
        },
        dry_run: {
          type: 'boolean',
          description: 'If true, returns preview confirmation without deleting',
        },
      },
      required: ['id'],
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      const id = String(args.id || '').trim();
      if (!id) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Entry ID is required.' }],
        };
      }
      if (args.dry_run) {
        const message = `[Dry Run] Entry ${id} would be deleted.`;
        return {
          toolResult: { dry_run: true, dryRun: true, id, message },
          content: [{ type: 'text', text: message }],
        };
      }
      try {
        const res = await apiFetch(`/api/entries/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errText = await res.text();
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to delete entry ${id}: ${errText || res.statusText}` }],
          };
        }
        return {
          toolResult: { success: true, id },
          content: [{ type: 'text', text: `Entry ${id} deleted successfully.` }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Error deleting entry: ${msg}` }],
        };
      }
    },
  };

  const bulkEntriesOperationTool: WebMCPToolDefinition = {
    name: 'bulk_entries_operation',
    description: 'Perform bulk operations (publish, unpublish, trash, add_tags, remove_tags) on multiple entries by IDs',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: {
            type: 'number',
          },
          description: 'Array of entry IDs to operate on',
        },
        action: {
          type: 'string',
          enum: ['publish', 'unpublish', 'trash', 'add_tags', 'remove_tags'],
          description: 'The bulk action to perform',
        },
        tags: {
          type: 'string',
          description: 'Comma-separated tags for add_tags or remove_tags actions',
        },
        dry_run: {
          type: 'boolean',
          description: 'If true, returns preview confirmation without executing changes',
        },
      },
      required: ['ids', 'action'],
    },
    handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
      const rawIds = Array.isArray(args.ids) ? args.ids : [];
      const ids = rawIds.map((id: any) => Number(id)).filter((n: number) => !isNaN(n) && n > 0);
      const action = String(args.action || '').trim();
      const tags = args.tags !== undefined ? String(args.tags).trim() : undefined;

      if (ids.length === 0) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'At least one valid numeric entry ID is required.' }],
        };
      }

      const validActions = ['publish', 'unpublish', 'trash', 'add_tags', 'remove_tags'];
      if (!validActions.includes(action)) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Invalid action "${action}". Must be one of: ${validActions.join(', ')}` }],
        };
      }

      if ((action === 'add_tags' || action === 'remove_tags') && (!tags || tags.length === 0)) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Tags parameter is required for tag operations.' }],
        };
      }

      if (args.dry_run) {
        const message = `[Dry Run] Bulk action "${action}" would be performed on ${ids.length} entries (IDs: ${ids.join(', ')})${tags ? ` with tags "${tags}"` : ''}.`;
        return {
          toolResult: { dry_run: true, dryRun: true, ids, action, tags, message },
          content: [{ type: 'text', text: message }],
        };
      }

      try {
        const payload: Record<string, any> = { ids, action };
        if (tags !== undefined) {
          payload.tags = tags;
        }

        const res = await apiFetch('/api/entries/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text();
          return {
            isError: true,
            content: [{ type: 'text', text: `Bulk operation failed: ${errText || res.statusText}` }],
          };
        }

        const data = await res.json();
        return {
          toolResult: data,
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text', text: `Error during bulk entries operation: ${msg}` }],
        };
      }
    },
  };

  return [listEntriesTool, getEntryTool, createEntryTool, deleteEntryTool, bulkEntriesOperationTool];
}

/**
 * Registers contextual active editor WebMCP tools for the TipTap editor and entry state.
 * Uses a ref to ensure handlers always access fresh values without re-registering on every keystroke.
 */
export function useTipTapWebMCP(options: UseTipTapWebMCPOptions): void {
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const getResolvedValues = () => {
    const opts = optionsRef.current;
    const dyn = opts.getFormValues ? opts.getFormValues() : undefined;
    return {
      content: dyn?.content !== undefined ? dyn.content : opts.content,
      title: dyn?.title !== undefined ? dyn.title : opts.title,
      slug: dyn?.slug !== undefined ? dyn.slug : opts.slug,
      status: dyn?.status !== undefined ? dyn.status : opts.status,
      description: dyn?.description !== undefined ? dyn.description : opts.description,
      tags: dyn?.tags !== undefined ? dyn.tags : opts.tags,
      category: dyn?.category !== undefined ? dyn.category : opts.category,
      coverImage: dyn?.coverImage !== undefined ? dyn.coverImage : opts.coverImage,
      canonicalUrl: dyn?.canonicalUrl !== undefined ? dyn.canonicalUrl : opts.canonicalUrl,
      schemaJson: dyn?.schemaJson !== undefined ? dyn.schemaJson : opts.schemaJson,
      parentId: dyn?.parentId !== undefined ? dyn.parentId : opts.parentId,
      sortOrder: dyn?.sortOrder !== undefined ? dyn.sortOrder : opts.sortOrder,
      sections: dyn?.sections !== undefined ? dyn.sections : opts.sections,
    };
  };

  const tools: WebMCPToolDefinition[] = React.useMemo(() => {
    const getContentTool: WebMCPToolDefinition = {
      name: 'editor_get_content',
      description: 'Get current editor content, page sections, and entry metadata',
      inputSchema: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['html', 'json', 'markdown'],
            description: 'Format of the content (html, json, or markdown, defaults to html)',
          },
        },
      },
      handler: (args: Record<string, any>): WebMCPToolResult => {
        const opts = optionsRef.current;
        const resolved = getResolvedValues();
        const format = args.format || 'html';
        let contentVal: any = '';

        if (opts.editor) {
          if (format === 'json') {
            contentVal = opts.editor.getJSON();
          } else if (format === 'markdown') {
            contentVal = opts.editor.getText();
          } else {
            contentVal = opts.editor.getHTML();
          }
        } else {
          contentVal = resolved.content || '';
        }

        const result: Record<string, any> = {
          content: contentVal,
          format,
          title: resolved.title,
          slug: resolved.slug,
          status: resolved.status,
          entryType: opts.entryType,
          description: resolved.description || '',
          tags: resolved.tags || '',
          category: resolved.category || '',
          cover_image: resolved.coverImage || '',
          canonical_url: resolved.canonicalUrl || '',
          schema_json: resolved.schemaJson || '',
          parent_id: resolved.parentId || '',
          sort_order: resolved.sortOrder ?? 0,
        };

        if (opts.entryType === 'page' || resolved.sections !== undefined) {
          result.sections = resolved.sections || [];
        }

        return {
          toolResult: result,
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    };

    const getSelectionTool: WebMCPToolDefinition = {
      name: 'editor_get_selection',
      description: 'Get active editor selection range and selected text',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: (): WebMCPToolResult => {
        const opts = optionsRef.current;
        if (opts.editor) {
          const { from, to, empty } = opts.editor.state.selection;
          const text = opts.editor.state.doc.textBetween(from, to, ' ');
          const sel = { from, to, empty, text };
          return {
            toolResult: sel,
            content: [{ type: 'text', text: JSON.stringify(sel, null, 2) }],
          };
        }
        const emptySel = { from: 0, to: 0, empty: true, text: '' };
        return {
          toolResult: emptySel,
          content: [{ type: 'text', text: JSON.stringify(emptySel, null, 2) }],
        };
      },
    };

    const insertContentTool: WebMCPToolDefinition = {
      name: 'editor_insert_content',
      description: 'Insert content into the active editor at cursor, start, or end position',
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'Content to insert into the editor',
          },
          format: {
            type: 'string',
            enum: ['html', 'markdown'],
            description: 'Format of the content',
          },
          position: {
            type: 'string',
            enum: ['cursor', 'start', 'end'],
            description: 'Position to insert (cursor, start, or end)',
          },
        },
        required: ['content'],
      },
      handler: (args: Record<string, any>): WebMCPToolResult => {
        const opts = optionsRef.current;
        const insertText = String(args.content ?? '');
        const position = args.position || 'cursor';

        if (opts.editor) {
          if (position === 'start') {
            opts.editor.chain().focus('start').insertContent(insertText).run();
          } else if (position === 'end') {
            opts.editor.chain().focus('end').insertContent(insertText).run();
          } else {
            opts.editor.chain().focus().insertContent(insertText).run();
          }
          const updatedHtml = opts.editor.getHTML();
          opts.setContent?.(updatedHtml);
        } else {
          let updated = getResolvedValues().content || '';
          if (position === 'start') {
            updated = insertText + updated;
          } else {
            updated = updated + insertText;
          }
          opts.setContent?.(updated);
        }

        return {
          toolResult: { success: true, position, inserted: insertText },
          content: [{ type: 'text', text: `Inserted content at ${position}.` }],
        };
      },
    };

    const replaceSelectionTool: WebMCPToolDefinition = {
      name: 'editor_replace_selection',
      description: 'Replace current editor selection with new content',
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'Content to replace the current selection with',
          },
        },
        required: ['content'],
      },
      handler: (args: Record<string, any>): WebMCPToolResult => {
        const opts = optionsRef.current;
        const repText = String(args.content ?? '');

        if (opts.editor) {
          opts.editor.chain().focus().insertContent(repText).run();
          const updatedHtml = opts.editor.getHTML();
          opts.setContent?.(updatedHtml);
        } else {
          opts.setContent?.(repText);
        }

        return {
          toolResult: { success: true, replaced: repText },
          content: [{ type: 'text', text: 'Replaced selection with new content.' }],
        };
      },
    };

    const setMetadataTool: WebMCPToolDefinition = {
      name: 'editor_set_metadata',
      description: 'Update metadata for the current entry (title, slug, description, category, tags, status, cover_image, canonical_url, schema_json, parent_id, sort_order)',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title of the entry' },
          slug: { type: 'string', description: 'URL-friendly slug' },
          description: { type: 'string', description: 'Meta description' },
          category: { type: 'string', description: 'Category' },
          tags: {
            description: 'Comma-separated string or array of tags',
          },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'scheduled'],
            description: 'Publication status',
          },
          cover_image: { type: 'string', description: 'Cover image URL' },
          canonical_url: { type: 'string', description: 'Canonical URL for SEO' },
          schema_json: { type: 'string', description: 'JSON-LD schema string' },
          parent_id: { type: 'string', description: 'Parent entry ID for hierarchical pages/docs' },
          sort_order: { type: 'number', description: 'Sort order relative to siblings' },
        },
      },
      handler: (args: Record<string, any>): WebMCPToolResult => {
        const opts = optionsRef.current;
        const updated: Record<string, any> = {};

        if (typeof args.title === 'string' && opts.setTitle) {
          opts.setTitle(args.title);
          updated.title = args.title;
        }
        if (typeof args.slug === 'string' && opts.setSlug) {
          opts.setSlug(args.slug);
          updated.slug = args.slug;
        }
        if (typeof args.description === 'string' && opts.setDescription) {
          opts.setDescription(args.description);
          updated.description = args.description;
        }
        if (typeof args.category === 'string' && opts.setCategory) {
          opts.setCategory(args.category);
          updated.category = args.category;
        }
        if (args.tags !== undefined && opts.setTags) {
          const tagsStr = Array.isArray(args.tags) ? args.tags.join(', ') : String(args.tags);
          opts.setTags(tagsStr);
          updated.tags = tagsStr;
        }
        if (args.status && ['draft', 'published', 'scheduled'].includes(args.status) && opts.setStatus) {
          opts.setStatus(args.status);
          updated.status = args.status;
        }
        if (args.cover_image !== undefined && opts.setCoverImage) {
          const val = String(args.cover_image);
          opts.setCoverImage(val);
          updated.cover_image = val;
        }
        if (args.canonical_url !== undefined && opts.setCanonicalUrl) {
          const val = String(args.canonical_url);
          opts.setCanonicalUrl(val);
          updated.canonical_url = val;
        }
        if (args.schema_json !== undefined && opts.setSchemaJson) {
          const val = typeof args.schema_json === 'string' ? args.schema_json : JSON.stringify(args.schema_json);
          opts.setSchemaJson(val);
          updated.schema_json = val;
        }
        if (args.parent_id !== undefined && opts.setParentId) {
          const val = args.parent_id === null ? '' : String(args.parent_id);
          opts.setParentId(val);
          updated.parent_id = val;
        }
        if (args.sort_order !== undefined && opts.setSortOrder) {
          const val = Number(args.sort_order);
          if (!Number.isNaN(val)) {
            opts.setSortOrder(val);
            updated.sort_order = val;
          }
        }

        return {
          toolResult: updated,
          content: [{ type: 'text', text: `Updated metadata: ${Object.keys(updated).join(', ')}` }],
        };
      },
    };

    const getSectionTemplatesTool: WebMCPToolDefinition = {
      name: 'editor_get_section_templates',
      description: 'Get available page section templates and their field schemas for the page editor',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: (): WebMCPToolResult => {
        const opts = optionsRef.current;
        const rawTemplates = opts.sectionTemplates || [];
        const templates = rawTemplates.map((tpl) => {
          let fields: any[] = [];
          if (tpl.schema_json) {
            try {
              fields = typeof tpl.schema_json === 'string' ? JSON.parse(tpl.schema_json) : tpl.schema_json;
              if (!Array.isArray(fields)) {
                fields = [];
              }
            } catch {
              fields = [];
            }
          }
          return {
            ...tpl,
            fields,
          };
        });

        return {
          toolResult: templates,
          content: [{ type: 'text', text: JSON.stringify(templates, null, 2) }],
        };
      },
    };

    const addSectionTool: WebMCPToolDefinition = {
      name: 'editor_add_section',
      description: 'Add a new page section instance by template type_id with optional initial field data and position index',
      inputSchema: {
        type: 'object',
        properties: {
          type_id: {
            type: 'string',
            description: 'The section template ID (e.g. hero, faq, features)',
          },
          data: {
            type: 'object',
            description: 'Initial key-value field data matching the template schema',
          },
          index: {
            type: 'number',
            description: 'Optional 0-based index to insert the section at (defaults to appending at the end)',
          },
        },
        required: ['type_id'],
      },
      handler: (args: Record<string, any>): WebMCPToolResult => {
        const opts = optionsRef.current;
        const typeId = typeof args.type_id === 'string' ? args.type_id.trim() : '';
        if (!typeId) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Field "type_id" is required and must be a non-empty string.' }],
          };
        }
        if (!opts.setSections) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Section editing is not available in the current editor.' }],
          };
        }

        const newSection: SectionInstance = {
          type_id: typeId,
          data: args.data && typeof args.data === 'object' ? { ...args.data } : {},
        };
        const current = [...(getResolvedValues().sections || [])];
        let insertIndex = current.length;

        if (typeof args.index === 'number' && !Number.isNaN(args.index)) {
          insertIndex = Math.max(0, Math.min(current.length, Math.trunc(args.index)));
          current.splice(insertIndex, 0, newSection);
        } else {
          current.push(newSection);
        }

        opts.setSections(current);
        optionsRef.current.sections = current;
        opts.onExpandSection?.(insertIndex);

        return {
          toolResult: {
            success: true,
            index: insertIndex,
            section: newSection,
            totalSections: current.length,
          },
          content: [{ type: 'text', text: `Added section "${newSection.type_id}" at index ${insertIndex}.` }],
        };
      },
    };

    const updateSectionTool: WebMCPToolDefinition = {
      name: 'editor_update_section',
      description: 'Update field data for an existing page section at a 0-based index',
      inputSchema: {
        type: 'object',
        properties: {
          index: {
            type: 'number',
            description: '0-based index of the section to update',
          },
          data: {
            type: 'object',
            description: 'Field data to merge or replace on the section',
          },
          merge: {
            type: 'boolean',
            description: 'If true (default), shallow-merges data with existing section data; if false, replaces section data completely',
          },
          type_id: {
            type: 'string',
            description: 'Optional new template type_id for the section',
          },
        },
        required: ['index', 'data'],
      },
      handler: (args: Record<string, any>): WebMCPToolResult => {
        const opts = optionsRef.current;
        if (!opts.setSections) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Section editing is not available in the current editor.' }],
          };
        }

        const current = [...(getResolvedValues().sections || [])];
        const idx = Number(args.index);
        if (!Number.isInteger(idx) || idx < 0 || idx >= current.length) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Section index ${args.index} is out of bounds (total sections: ${current.length}).`,
              },
            ],
          };
        }

        if (!args.data || typeof args.data !== 'object') {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Field "data" is required and must be an object.' }],
          };
        }

        const merge = args.merge !== false;
        const existing = current[idx];
        const updatedSection: SectionInstance = {
          type_id:
            typeof args.type_id === 'string' && args.type_id.trim()
              ? args.type_id.trim()
              : existing.type_id,
          data: merge ? { ...(existing.data || {}), ...args.data } : { ...args.data },
        };

        current[idx] = updatedSection;
        opts.setSections(current);
        optionsRef.current.sections = current;

        return {
          toolResult: {
            success: true,
            index: idx,
            section: updatedSection,
          },
          content: [{ type: 'text', text: `Updated section at index ${idx}.` }],
        };
      },
    };

    const removeSectionTool: WebMCPToolDefinition = {
      name: 'editor_remove_section',
      description: 'Remove a page section at a 0-based index',
      inputSchema: {
        type: 'object',
        properties: {
          index: {
            type: 'number',
            description: '0-based index of the section to remove',
          },
        },
        required: ['index'],
      },
      handler: (args: Record<string, any>): WebMCPToolResult => {
        const opts = optionsRef.current;
        if (!opts.setSections) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Section editing is not available in the current editor.' }],
          };
        }

        const current = [...(getResolvedValues().sections || [])];
        const idx = Number(args.index);
        if (!Number.isInteger(idx) || idx < 0 || idx >= current.length) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Section index ${args.index} is out of bounds (total sections: ${current.length}).`,
              },
            ],
          };
        }

        const [removed] = current.splice(idx, 1);
        opts.setSections(current);
        optionsRef.current.sections = current;

        return {
          toolResult: {
            success: true,
            index: idx,
            removed,
            totalSections: current.length,
          },
          content: [{ type: 'text', text: `Removed section at index ${idx}.` }],
        };
      },
    };

    const moveSectionTool: WebMCPToolDefinition = {
      name: 'editor_move_section',
      description: 'Move a page section from one 0-based index to another',
      inputSchema: {
        type: 'object',
        properties: {
          from_index: {
            type: 'number',
            description: 'Current 0-based index of the section',
          },
          to_index: {
            type: 'number',
            description: 'Target 0-based index for the section',
          },
        },
        required: ['from_index', 'to_index'],
      },
      handler: (args: Record<string, any>): WebMCPToolResult => {
        const opts = optionsRef.current;
        if (!opts.setSections) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Section editing is not available in the current editor.' }],
          };
        }

        const current = [...(getResolvedValues().sections || [])];
        const fromIdx = Number(args.from_index);
        const toIdx = Number(args.to_index);
        if (
          !Number.isInteger(fromIdx) ||
          fromIdx < 0 ||
          fromIdx >= current.length ||
          !Number.isInteger(toIdx) ||
          toIdx < 0 ||
          toIdx >= current.length
        ) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Section indices (${args.from_index} -> ${args.to_index}) are out of bounds (total sections: ${current.length}).`,
              },
            ],
          };
        }

        const [moved] = current.splice(fromIdx, 1);
        current.splice(toIdx, 0, moved);
        opts.setSections(current);
        optionsRef.current.sections = current;

        return {
          toolResult: {
            success: true,
            from_index: fromIdx,
            to_index: toIdx,
            sections: current,
          },
          content: [{ type: 'text', text: `Moved section from index ${fromIdx} to ${toIdx}.` }],
        };
      },
    };

    const setSectionsTool: WebMCPToolDefinition = {
      name: 'editor_set_sections',
      description: 'Replace the entire list of page sections in a single batch operation',
      inputSchema: {
        type: 'object',
        properties: {
          sections: {
            type: 'array',
            description: 'Complete ordered array of section instances ({ type_id, data })',
            items: {
              type: 'object',
              properties: {
                type_id: { type: 'string' },
                data: { type: 'object' },
              },
              required: ['type_id'],
            },
          },
        },
        required: ['sections'],
      },
      handler: (args: Record<string, any>): WebMCPToolResult => {
        const opts = optionsRef.current;
        if (!opts.setSections) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Section editing is not available in the current editor.' }],
          };
        }
        if (!Array.isArray(args.sections)) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Field "sections" must be an array.' }],
          };
        }

        for (let i = 0; i < args.sections.length; i++) {
          const item = args.sections[i];
          if (!item || typeof item.type_id !== 'string' || !item.type_id.trim()) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Section at index ${i} is missing a valid "type_id".` }],
            };
          }
        }

        const normalized: SectionInstance[] = args.sections.map((s: any) => ({
          type_id: String(s.type_id).trim(),
          data: s.data && typeof s.data === 'object' ? { ...s.data } : {},
        }));

        opts.setSections(normalized);
        optionsRef.current.sections = normalized;

        return {
          toolResult: {
            success: true,
            sections: normalized,
            totalSections: normalized.length,
          },
          content: [{ type: 'text', text: `Replaced page sections with ${normalized.length} section(s).` }],
        };
      },
    };

    const saveDraftTool: WebMCPToolDefinition = {
      name: 'editor_save_draft',
      description: 'Trigger saving the current entry as draft',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (): Promise<WebMCPToolResult> => {
        const opts = optionsRef.current;
        if (opts.onSaveDraft) {
          const res = await opts.onSaveDraft();
          return {
            toolResult: res ?? { success: true, status: 'draft' },
            content: [{ type: 'text', text: 'Saved draft successfully.' }],
          };
        }
        return {
          toolResult: { success: true, status: 'draft' },
          content: [{ type: 'text', text: 'Saved draft.' }],
        };
      },
    };

    const publishTool: WebMCPToolDefinition = {
      name: 'editor_publish',
      description: 'Trigger publishing the current entry',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (): Promise<WebMCPToolResult> => {
        const opts = optionsRef.current;
        if (opts.onPublish) {
          const res = await opts.onPublish();
          return {
            toolResult: res ?? { success: true, status: 'published' },
            content: [{ type: 'text', text: 'Published entry successfully.' }],
          };
        }
        return {
          toolResult: { success: true, status: 'published' },
          content: [{ type: 'text', text: 'Published entry.' }],
        };
      },
    };

    return [
      getContentTool,
      getSelectionTool,
      insertContentTool,
      replaceSelectionTool,
      setMetadataTool,
      getSectionTemplatesTool,
      addSectionTool,
      updateSectionTool,
      removeSectionTool,
      moveSectionTool,
      setSectionsTool,
      saveDraftTool,
      publishTool,
    ];
  }, []);

  useRegisterWebMCPTools(tools, []);
}

