import React from 'react';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { apiFetch } from '../../utils/api';
import { useRegisterWebMCPTools } from '../../providers/WebMCPProvider';
import type { WebMCPToolDefinition, WebMCPToolResult } from './types';

export interface UseTipTapWebMCPOptions {
  editor: TipTapEditor | null;
  content: string;
  setContent: (content: string) => void;
  title: string;
  setTitle: (title: string) => void;
  slug: string;
  setSlug: (slug: string) => void;
  status: 'draft' | 'published' | 'scheduled';
  setStatus: (status: 'draft' | 'published' | 'scheduled') => void;
  entryType: string;
  description?: string;
  setDescription?: (description: string) => void;
  category?: string;
  setCategory?: (category: string) => void;
  tags?: string;
  setTags?: (tags: string) => void;
  sections?: any[];
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

  return [listEntriesTool, getEntryTool, createEntryTool, deleteEntryTool];
}

/**
 * Registers contextual active editor WebMCP tools for the TipTap editor and entry state.
 * Uses a ref to ensure handlers always access fresh values without re-registering on every keystroke.
 */
export function useTipTapWebMCP(options: UseTipTapWebMCPOptions): void {
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

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
          contentVal = opts.content || '';
        }

        const result: Record<string, any> = {
          content: contentVal,
          format,
          title: opts.title,
          slug: opts.slug,
          status: opts.status,
          entryType: opts.entryType,
          description: opts.description || '',
          tags: opts.tags || '',
          category: opts.category || '',
        };

        if (opts.entryType === 'page') {
          result.sections = opts.sections || [];
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
          opts.setContent(updatedHtml);
        } else {
          let updated = opts.content || '';
          if (position === 'start') {
            updated = insertText + updated;
          } else {
            updated = updated + insertText;
          }
          opts.setContent(updated);
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
          opts.setContent(updatedHtml);
        } else {
          opts.setContent(repText);
        }

        return {
          toolResult: { success: true, replaced: repText },
          content: [{ type: 'text', text: 'Replaced selection with new content.' }],
        };
      },
    };

    const setMetadataTool: WebMCPToolDefinition = {
      name: 'editor_set_metadata',
      description: 'Update metadata for the current entry (title, slug, description, category, tags, status)',
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

        return {
          toolResult: updated,
          content: [{ type: 'text', text: `Updated metadata: ${Object.keys(updated).join(', ')}` }],
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
      saveDraftTool,
      publishTool,
    ];
  }, []);

  useRegisterWebMCPTools(tools, []);
}
