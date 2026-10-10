import React from 'react';
import { apiFetch } from '../../utils/api';
import { useRegisterWebMCPTools } from '../../providers/WebMCPProvider';
import type { WebMCPToolDefinition, WebMCPToolResult } from './types';

export const DEFAULT_THEME_TOKENS: Record<string, any> = {
  fontUrl:
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&display=swap',
  fontHeadline: "'Newsreader', Georgia, serif",
  fontBody: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  colorBg: '#faf8f5',
  colorText: '#1c1917',
  colorTextMuted: '#78716c',
  colorAccent: '#991b1b',
  colorSurface: '#ffffff',
  colorBorder: '#e7e5e4',
  maxWidth: '740px',
  fontSizeBase: '18px',
  lineHeightBody: '1.75',
  headerLayout: 'centered',
  headerBorderStyle: 'double',
  headerTitleSize: '2rem',
  headerNavTransform: 'uppercase',
  headerPadding: '1.75rem 0 1.25rem 0',
  headerTagline: 'An Editorial Review & Journal',
};

export const DEFAULT_THEME_SETTINGS: Record<string, string> = {
  theme_font_url: DEFAULT_THEME_TOKENS.fontUrl,
  theme_font_headline: DEFAULT_THEME_TOKENS.fontHeadline,
  theme_font_body: DEFAULT_THEME_TOKENS.fontBody,
  theme_color_bg: DEFAULT_THEME_TOKENS.colorBg,
  theme_color_text: DEFAULT_THEME_TOKENS.colorText,
  theme_color_text_muted: DEFAULT_THEME_TOKENS.colorTextMuted,
  theme_color_accent: DEFAULT_THEME_TOKENS.colorAccent,
  theme_color_surface: DEFAULT_THEME_TOKENS.colorSurface,
  theme_color_border: DEFAULT_THEME_TOKENS.colorBorder,
  theme_max_width: DEFAULT_THEME_TOKENS.maxWidth,
  theme_font_size_base: DEFAULT_THEME_TOKENS.fontSizeBase,
  theme_line_height: DEFAULT_THEME_TOKENS.lineHeightBody,
  theme_header_layout: DEFAULT_THEME_TOKENS.headerLayout,
  theme_header_border_style: DEFAULT_THEME_TOKENS.headerBorderStyle,
  theme_header_title_size: DEFAULT_THEME_TOKENS.headerTitleSize,
  theme_header_nav_transform: DEFAULT_THEME_TOKENS.headerNavTransform,
  theme_header_padding: DEFAULT_THEME_TOKENS.headerPadding,
  theme_header_tagline: DEFAULT_THEME_TOKENS.headerTagline,
};

export interface ThemeEditorWebMCPOptions<T = any> {
  tokens: T;
  setTokens: React.Dispatch<React.SetStateAction<T>> | ((tokens: T | ((prev: T) => T)) => void);
  onReset?: () => void;
}

/**
 * Registers active live-preview theme tools when ThemeEditor is mounted.
 * Allows an AI agent to inspect and update in-memory theme tokens in real time without persisting to the backend.
 */
export function useThemeEditorWebMCP<T extends Record<string, any> = Record<string, any>>(
  options: ThemeEditorWebMCPOptions<T>
): void {
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const tools = React.useMemo<WebMCPToolDefinition[]>(() => {
    return [
      {
        name: 'theme_get_active_tokens',
        description: 'Get active in-memory theme tokens and styling state currently loaded in ThemeEditor',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: (): WebMCPToolResult => {
          const currentTokens = optionsRef.current.tokens;
          return {
            toolResult: currentTokens,
            content: [{ type: 'text', text: JSON.stringify(currentTokens, null, 2) }],
          };
        },
      },
      {
        name: 'theme_update_live_tokens',
        description: 'Update live in-memory theme tokens in ThemeEditor to preview styling changes in real-time without saving to backend',
        inputSchema: {
          type: 'object',
          properties: {
            tokens: {
              type: 'object',
              description: 'Partial or complete theme tokens to apply in-memory (e.g. colorAccent, fontHeadline, headerLayout)',
            },
          },
          required: ['tokens'],
        },
        handler: (args: Record<string, any>): WebMCPToolResult => {
          const newTokens = (args.tokens && typeof args.tokens === 'object') ? args.tokens : {};
          optionsRef.current.setTokens((prev: any) => ({
            ...prev,
            ...newTokens,
          }));
          return {
            toolResult: { appliedTokens: newTokens },
            content: [{ type: 'text', text: `Live theme tokens updated: ${Object.keys(newTokens).join(', ')}` }],
          };
        },
      },
      {
        name: 'theme_reset_live_tokens',
        description: 'Reset live in-memory theme tokens in ThemeEditor to default values (Modern Editorial preset)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: (): WebMCPToolResult => {
          if (optionsRef.current.onReset) {
            optionsRef.current.onReset();
          } else {
            optionsRef.current.setTokens((prev: any) => ({
              ...prev,
              ...DEFAULT_THEME_TOKENS,
            }));
          }
          return {
            toolResult: { reset: true },
            content: [{ type: 'text', text: 'Live theme tokens reset to Modern Editorial defaults.' }],
          };
        },
      },
    ];
  }, []);

  useRegisterWebMCPTools(tools);
}

/**
 * Creates global WebMCP tools for Theme Settings, Menus, and Media Management.
 */
export function createGlobalThemeMediaMenuTools(): WebMCPToolDefinition[] {
  return [
    {
      name: 'get_theme_settings',
      description: 'Get current site theme settings and styling design tokens from the backend',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (): Promise<WebMCPToolResult> => {
        const res = await apiFetch('/api/settings');
        if (!res.ok) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to fetch theme settings: ${res.statusText || res.status}` }],
          };
        }
        const data = await res.json();
        return {
          toolResult: data,
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      },
    },
    {
      name: 'update_theme_settings',
      description: 'Update theme settings and design tokens in the backend (supports dry_run preview)',
      inputSchema: {
        type: 'object',
        properties: {
          settings: {
            type: 'object',
            description: 'Key-value map of theme settings or tokens to update',
          },
          dry_run: {
            type: 'boolean',
            description: 'If true, returns preview of theme token changes without persisting',
          },
        },
        required: ['settings'],
      },
      handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
        const settings = (args.settings && typeof args.settings === 'object') ? args.settings : {};
        if (args.dry_run) {
          return {
            toolResult: { dry_run: true, settings },
            content: [{
              type: 'text',
              text: `[Dry Run] Preview of theme settings update:\n${JSON.stringify(settings, null, 2)}`,
            }],
          };
        }

        let res = await apiFetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });

        if (res.status === 404 || res.status === 405) {
          res = await apiFetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings }),
          });
        }

        if (!res.ok) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to update theme settings: ${res.statusText || res.status}` }],
          };
        }

        let resData: any = {};
        try {
          resData = await res.json();
        } catch {
          resData = { success: true };
        }

        return {
          toolResult: { settings, ...resData },
          content: [{ type: 'text', text: 'Theme settings successfully updated.' }],
        };
      },
    },
    {
      name: 'reset_theme_to_defaults',
      description: 'Reset theme settings to default values (supports dry_run preview)',
      inputSchema: {
        type: 'object',
        properties: {
          dry_run: {
            type: 'boolean',
            description: 'If true, returns preview of theme reset without persisting',
          },
        },
      },
      handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
        if (args.dry_run) {
          return {
            toolResult: { dry_run: true, settings: DEFAULT_THEME_SETTINGS },
            content: [{
              type: 'text',
              text: `[Dry Run] Preview of theme settings reset to defaults:\n${JSON.stringify(DEFAULT_THEME_SETTINGS, null, 2)}`,
            }],
          };
        }

        let res = await apiFetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(DEFAULT_THEME_SETTINGS),
        });

        if (res.status === 404 || res.status === 405) {
          res = await apiFetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: DEFAULT_THEME_SETTINGS }),
          });
        }

        if (!res.ok) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to reset theme settings: ${res.statusText || res.status}` }],
          };
        }

        let resData: any = {};
        try {
          resData = await res.json();
        } catch {
          resData = { success: true };
        }

        return {
          toolResult: { reset: true, settings: DEFAULT_THEME_SETTINGS, ...resData },
          content: [{ type: 'text', text: 'Theme settings successfully reset to defaults.' }],
        };
      },
    },
    {
      name: 'get_menu',
      description: 'Get navigation menu items (optionally filtered by slug, e.g. "header" or "footer")',
      inputSchema: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'Menu slug or name (e.g. "header" or "footer"). If omitted, returns all menus.',
          },
        },
      },
      handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
        const slug = args.slug ? String(args.slug) : undefined;
        const res = await apiFetch('/api/menus');
        if (!res.ok) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to fetch menus: ${res.statusText || res.status}` }],
          };
        }

        const data = await res.json();
        let result: any = data;

        if (slug) {
          if (data && typeof data === 'object' && !Array.isArray(data) && data[slug]) {
            result = data[slug];
          } else if (Array.isArray(data)) {
            const found = data.find((m: any) => m.name === slug || m.slug === slug);
            if (found) {
              result = found;
            } else {
              return {
                isError: true,
                content: [{ type: 'text', text: `Menu not found for slug: ${slug}` }],
              };
            }
          } else {
            // Try fetching specific menu endpoint /api/menus/:name
            const singleRes = await apiFetch(`/api/menus/${encodeURIComponent(slug)}`);
            if (singleRes.ok) {
              result = await singleRes.json();
            } else {
              return {
                isError: true,
                content: [{ type: 'text', text: `Menu not found for slug: ${slug}` }],
              };
            }
          }
        }

        return {
          toolResult: result,
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      },
    },
    {
      name: 'update_menu_items',
      description: 'Update navigation menu items for a menu slug (supports dry_run preview)',
      inputSchema: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'The menu slug/name to update (e.g. "header" or "footer", defaults to "header")',
          },
          items: {
            type: 'array',
            items: { type: 'object' },
            description: 'Array of menu items (title, url, target, children)',
          },
          dry_run: {
            type: 'boolean',
            description: 'If true, returns preview of menu changes without persisting',
          },
        },
        required: ['items'],
      },
      handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
        const slug = String(args.slug || 'header');
        const items = Array.isArray(args.items) ? args.items : [];

        if (args.dry_run) {
          return {
            toolResult: { dry_run: true, slug, items },
            content: [{
              type: 'text',
              text: `[Dry Run] Preview of menu items update for "${slug}":\n${JSON.stringify(items, null, 2)}`,
            }],
          };
        }

        const res = await apiFetch(`/api/menus/${encodeURIComponent(slug)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items_json: JSON.stringify(items) }),
        });

        if (!res.ok) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to update menu items: ${res.statusText || res.status}` }],
          };
        }

        let resData: any = {};
        try {
          resData = await res.json();
        } catch {
          resData = { success: true };
        }

        return {
          toolResult: { slug, items, ...resData },
          content: [{ type: 'text', text: `Navigation menu "${slug}" successfully updated with ${items.length} items.` }],
        };
      },
    },
    {
      name: 'list_media',
      description: 'List uploaded media files with optional search filtering and pagination',
      inputSchema: {
        type: 'object',
        properties: {
          page: {
            type: 'number',
            description: 'Page number for pagination (defaults to 1)',
          },
          limit: {
            type: 'number',
            description: 'Number of items per page (defaults to 24)',
          },
          query: {
            type: 'string',
            description: 'Search query matching filename, title, or alt text',
          },
        },
      },
        handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
        const params = new URLSearchParams();
        if (args.query) params.set('search', String(args.query));
        if (args.page) params.set('page', String(args.page));
        if (args.limit) params.set('per_page', String(args.limit));
        const qs = params.toString();
        const url = qs ? `/api/media?${qs}` : '/api/media';

        const res = await apiFetch(url);
        if (!res.ok) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to fetch media: ${res.statusText || res.status}` }],
          };
        }

        const data = await res.json();
        let items: any[] = [];
        if (Array.isArray(data)) {
          items = data;
        } else if (Array.isArray(data.media)) {
          items = data.media;
        } else if (Array.isArray(data.items)) {
          items = data.items;
        }

        // Search query filtering
        if (args.query) {
          const q = String(args.query).toLowerCase();
          items = items.filter((item) => {
            const filename = String(item.filename || item.name || item.key || '').toLowerCase();
            const altText = String(item.alt_text || item.alt || '').toLowerCase();
            const title = String(item.title || '').toLowerCase();
            return filename.includes(q) || altText.includes(q) || title.includes(q);
          });
        }

        const page = Math.max(1, Number(args.page) || 1);
        const limit = Math.max(1, Number(args.limit) || 24);
        const total = (data.pagination && typeof data.pagination.total_items === 'number')
          ? data.pagination.total_items
          : items.length;

        let paginated = items;
        // Paginate in memory if backend did not paginate
        if (!data.pagination && items.length > limit) {
          const start = (page - 1) * limit;
          paginated = items.slice(start, start + limit);
        }

        return {
          toolResult: {
            media: paginated,
            page,
            limit,
            total,
          },
          content: [{
            type: 'text',
            text: JSON.stringify({
              media: paginated,
              page,
              limit,
              total,
            }, null, 2),
          }],
        };
      },
    },
    {
      name: 'get_media_details',
      description: 'Get details for a specific media item by ID or key',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The unique ID or key of the media item',
          },
        },
        required: ['id'],
      },
      handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
        const id = String(args.id || '');
        if (!id) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Missing required media id' }],
          };
        }

        // Try /api/media/:id
        try {
          const res = await apiFetch(`/api/media/${encodeURIComponent(id)}`);
          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const data = await res.json();
              return {
                toolResult: data,
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
              };
            }
          }
        } catch {
          // fallback to list
        }

        // Fallback: fetch media list and locate item
        const listRes = await apiFetch('/api/media');
        if (listRes.ok) {
          const data = await listRes.json();
          const items: any[] = Array.isArray(data)
            ? data
            : (Array.isArray(data.media) ? data.media : (Array.isArray(data.items) ? data.items : []));
          const found = items.find(
            (item) => String(item.id) === id || String(item.key) === id || String(item.filename) === id
          );
          if (found) {
            return {
              toolResult: found,
              content: [{ type: 'text', text: JSON.stringify(found, null, 2) }],
            };
          }
        }

        return {
          isError: true,
          content: [{ type: 'text', text: `Media item not found: ${id}` }],
        };
      },
    },
    {
      name: 'update_media_metadata',
      description: 'Update accessibility alt text and title for a media item',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The unique ID or key of the media item',
          },
          alt_text: {
            type: 'string',
            description: 'Alternative text describing the media for accessibility',
          },
          title: {
            type: 'string',
            description: 'Optional title or caption for the media item',
          },
        },
        required: ['id', 'alt_text'],
      },
      handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
        const id = String(args.id || '');
        const alt_text = String(args.alt_text || '');
        const title = args.title !== undefined ? String(args.title) : undefined;

        if (!id) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Missing required media id' }],
          };
        }

        const res = await apiFetch(`/api/media/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alt_text, title }),
        });

        if (!res.ok) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to update media metadata: ${res.statusText || res.status}` }],
          };
        }

        let resData: any = {};
        try {
          resData = await res.json();
        } catch {
          resData = { success: true };
        }

        return {
          toolResult: { id, alt_text, title, ...resData },
          content: [{ type: 'text', text: `Media metadata updated for ${id}` }],
        };
      },
    },
  ];
}
