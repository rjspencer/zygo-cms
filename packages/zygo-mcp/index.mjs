#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const isDirectRun = Boolean(process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));

// Parse CLI arguments
const args = process.argv.slice(2);
let url = "http://localhost:8787";
let clientId = process.env.CF_ACCESS_CLIENT_ID || "";
let clientSecret = process.env.CF_ACCESS_CLIENT_SECRET || "";

for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) url = args[++i];
    if (args[i] === "--client-id" && args[i + 1]) clientId = args[++i];
    if (args[i] === "--client-secret" && args[i + 1]) clientSecret = args[++i];
}

url = url.replace(/\/$/, ""); // Remove trailing slash

if (isDirectRun && (!clientId || !clientSecret)) {
    console.error("Error: Both --client-id and --client-secret are required. Provide your Cloudflare Access Service Token credentials.");
    process.exit(1);
}

export const server = new Server(
    { name: "zygo-cms-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

// Define standard headers
export const getHeaders = (overrideClientId, overrideClientSecret, overrideCookie) => {
    const headers = {
        "CF-Access-Client-Id": overrideClientId || clientId,
        "CF-Access-Client-Secret": overrideClientSecret || clientSecret,
        "Content-Type": "application/json"
    };
    if (overrideCookie) {
        headers["Cookie"] = overrideCookie;
    }
    return headers;
};

export const getApiUrl = (path, overrideUrl) => {
    const base = (overrideUrl || url).replace(/\/$/, "");
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (base.endsWith('/api')) {
        return `${base}${cleanPath}`;
    }
    return `${base}/api${cleanPath}`;
};

export const tools = [
    // ==========================================
    // A. Entries (Posts, Pages, Docs)
    // ==========================================
    {
        name: "zygo_list_entries",
        description: "List posts, pages, or docs from Zygo CMS with optional filtering by type, status, or search query",
        inputSchema: {
            type: "object",
            properties: {
                type: { type: "string", enum: ["post", "page", "doc"], description: "Filter by type" },
                status: { type: "string", enum: ["draft", "in_review", "ready_for_publish", "published", "archived", "scheduled"], description: "Filter by status (draft, in_review, ready_for_publish, published, archived, scheduled)" },
                search: { type: "string", description: "Search query matching title or slug" }
            }
        }
    },
    {
        name: "zygo_get_entry",
        description: "Get a post, page, or doc by its UUID id or slug, returning full details and parsed sections for pages",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "The UUID id or slug of the entry" }
            },
            required: ["id"]
        }
    },
    {
        name: "zygo_create_entry",
        description: "Create a new entry (post, page, or doc). For pages, pass sections array; for posts/docs, pass body_html.",
        inputSchema: {
            type: "object",
            properties: {
                title: { type: "string" },
                slug: { type: "string" },
                type: { type: "string", enum: ["post", "page", "doc"] },
                status: { type: "string", enum: ["draft", "in_review", "ready_for_publish", "published", "archived", "scheduled"] },
                description: { type: "string" },
                body_html: { type: "string", description: "Raw HTML content (used for posts/docs)" },
                sections: { type: "array", items: { type: "object" }, description: "Array of section instances (used for pages)" },
                body_json: { type: "string", description: "Optional raw JSON string" },
                category: { type: "string" },
                tags: { type: "string", description: "Comma-separated tags" },
                cover_image: { type: "string" },
                canonical_url: { type: "string" },
                parent_id: { type: "string" },
                sort_order: { type: "number" }
            },
            required: ["title", "slug", "type", "status"]
        }
    },
    {
        name: "zygo_update_entry",
        description: "Update an existing entry (post, page, or doc) by UUID id.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "UUID of the entry to update" },
                title: { type: "string" },
                slug: { type: "string" },
                type: { type: "string", enum: ["post", "page", "doc"] },
                status: { type: "string", enum: ["draft", "in_review", "ready_for_publish", "published", "archived", "scheduled"] },
                description: { type: "string" },
                body_html: { type: "string", description: "Raw HTML content (used for posts/docs)" },
                sections: { type: "array", items: { type: "object" }, description: "Array of section instances (used for pages)" },
                body_json: { type: "string", description: "Optional raw JSON string" },
                category: { type: "string" },
                tags: { type: "string", description: "Comma-separated tags" },
                cover_image: { type: "string" },
                canonical_url: { type: "string" },
                parent_id: { type: "string" },
                sort_order: { type: "number" }
            },
            required: ["id"]
        }
    },
    {
        name: "zygo_delete_entry",
        description: "Soft-delete an entry to Trash by UUID id.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "UUID of the entry to delete" }
            },
            required: ["id"]
        }
    },
    {
        name: "zygo_restore_entry",
        description: "Restore a soft-deleted entry from Trash by UUID id.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "UUID of the entry to restore" }
            },
            required: ["id"]
        }
    },
    {
        name: "zygo_bulk_entries",
        description: "Perform a batch operation on multiple entries: publish, unpublish, trash, add_tags, or remove_tags.",
        inputSchema: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: ["publish", "unpublish", "trash", "add_tags", "remove_tags"],
                    description: "Operation to execute"
                },
                ids: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of entry UUIDs"
                },
                tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tags to add or remove (when action is add_tags or remove_tags)"
                }
            },
            required: ["action", "ids"]
        }
    },
    // Backward compatibility aliases
    {
        name: "zygo_list_posts",
        description: "List all published posts in Zygo CMS.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "zygo_read_post",
        description: "Read a specific post by its slug.",
        inputSchema: {
            type: "object",
            properties: {
                slug: { type: "string", description: "The slug of the post (e.g. 'hello-world')" }
            },
            required: ["slug"]
        }
    },
    {
        name: "zygo_upsert_post",
        description: "Create or update a post in Zygo CMS.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "Optional UUID. If provided, updates existing post." },
                title: { type: "string" },
                slug: { type: "string" },
                description: { type: "string" },
                type: { type: "string", enum: ["post", "page"] },
                status: { type: "string", enum: ["draft", "published"] },
                body_html: { type: "string", description: "The raw HTML content of the post." },
                body_json: { type: "string", description: "Optional TipTap JSON representation." },
                category: { type: "string" },
                tags: { type: "string", description: "Comma-separated tags." }
            },
            required: ["title", "slug", "type", "status", "body_html"]
        }
    },

    // ==========================================
    // B. Section & Layout Templates
    // ==========================================
    {
        name: "zygo_list_section_templates",
        description: "List all custom and built-in section templates in Zygo CMS.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "zygo_get_section_template",
        description: "Get full details, schema, markup, and styles of a section template by ID.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "ID of the section template" }
            },
            required: ["id"]
        }
    },
    {
        name: "zygo_upsert_section_template",
        description: "Create or update a section template (markup, styles, schema, category, name).",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "Template ID (e.g. 'hero-split' or UUID)" },
                name: { type: "string" },
                description: { type: "string" },
                category: { type: "string" },
                markup: { type: "string" },
                styles: { type: "string" },
                schema: { type: "string", description: "JSON schema string defining fields" },
                template_html: { type: "string" },
                template_css: { type: "string" },
                schema_json: { type: "string" }
            },
            required: ["id"]
        }
    },
    {
        name: "zygo_delete_section_template",
        description: "Delete a section template by ID.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string" }
            },
            required: ["id"]
        }
    },
    {
        name: "zygo_list_layout_templates",
        description: "List layout templates (e.g. 'docs', 'posts', 'page').",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "zygo_get_layout_template",
        description: "Get a layout template by ID ('docs', 'posts', 'page').",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string" }
            },
            required: ["id"]
        }
    },
    {
        name: "zygo_update_layout_template",
        description: "Update the HTML or CSS of a layout template by ID.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "Layout ID ('docs', 'posts', 'page')" },
                template_html: { type: "string" },
                template_css: { type: "string" }
            },
            required: ["id"]
        }
    },

    // ==========================================
    // C. Navigation Menus
    // ==========================================
    {
        name: "zygo_get_menu",
        description: "Get a navigation menu by name ('header' or 'footer').",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", enum: ["header", "footer"] },
                slug: { type: "string", description: "Menu slug or name (defaults to 'header')" }
            }
        }
    },
    {
        name: "zygo_update_menu",
        description: "Update navigation menu items for 'header' or 'footer'.",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", enum: ["header", "footer"] },
                slug: { type: "string", description: "Menu slug or name (defaults to 'header')" },
                items: {
                    type: "array",
                    items: { type: "object" },
                    description: "Array of menu items ({ title, url, openInNewTab, ... })"
                }
            },
            required: ["items"]
        }
    },

    // ==========================================
    // D. Media & Themes
    // ==========================================
    {
        name: "zygo_list_media",
        description: "List all media files uploaded to R2 storage.",
        inputSchema: {
            type: "object",
            properties: {
                page: { type: "number" },
                limit: { type: "number" },
                query: { type: "string" }
            }
        }
    },
    {
        name: "zygo_delete_media",
        description: "Delete a media file by key from R2 storage.",
        inputSchema: {
            type: "object",
            properties: {
                key: { type: "string" }
            },
            required: ["key"]
        }
    },
    {
        name: "zygo_get_theme_settings",
        description: "Get active theme settings, color tokens, and custom CSS.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "zygo_update_theme_settings",
        description: "Update theme CSS or active preset in settings.",
        inputSchema: {
            type: "object",
            properties: {
                settings: {
                    type: "object",
                    description: "Key-value map of theme settings or tokens to update"
                },
                theme_css: { type: "string", description: "Custom CSS overrides" },
                active_preset: { type: "string", description: "Active preset name" }
            },
            required: ["settings"]
        }
    },
    {
        name: "zygo_reset_theme_to_defaults",
        description: "Reset theme settings back to default styling.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "zygo_list_themes",
        description: "List all themes in the CMS, including built-in presets and custom themes, with active primary and dark role indicators",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "zygo_get_theme",
        description: "Get details and tokens for a specific theme by ID",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "The theme ID" }
            },
            required: ["id"]
        }
    },
    {
        name: "zygo_create_theme",
        description: "Create a new custom theme",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Name of the theme" },
                description: { type: "string", description: "Optional description of the theme" },
                baseThemeId: { type: "string", description: "Base theme preset or existing theme ID" },
                tokens: { type: "object", description: "Custom theme design tokens" }
            },
            required: ["name"]
        }
    },
    {
        name: "zygo_activate_theme",
        description: "Set a theme as the active Primary Theme or Dark Mode Variant, or clear the dark variant",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: ["string", "null"], description: "Theme ID, or null/empty to clear dark variant" },
                role: { type: "string", enum: ["primary", "dark"], description: "Role to assign theme to ('primary' or 'dark')" }
            },
            required: ["role"]
        }
    },
    {
        name: "zygo_duplicate_theme",
        description: "Duplicate an existing theme (built-in or custom) to create an editable copy",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "ID of theme to duplicate" }
            },
            required: ["id"]
        }
    },
    {
        name: "zygo_rename_theme",
        description: "Rename a custom theme (built-in locked themes cannot be renamed)",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "Theme ID to rename" },
                name: { type: "string", description: "New theme name" }
            },
            required: ["id", "name"]
        }
    },
    {
        name: "zygo_delete_theme",
        description: "Delete a custom theme (built-in locked themes and active themes cannot be deleted)",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "Theme ID to delete" }
            },
            required: ["id"]
        }
    },

    // ==========================================
    // E. Retained Site, Cache, Redirect & Submission Tools
    // ==========================================
    {
        name: "zygo_get_settings",
        description: "Get all site settings including branding (site_title, site_logo, site_logo_dark, site_favicon, default_og_image, footer_text), canonical_origin, docs, and analytics.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "zygo_update_settings",
        description: "Update site settings in the backend (e.g. site_title, site_logo, site_logo_dark, site_favicon, default_og_image, footer_text, canonical_origin, docs_path).",
        inputSchema: {
            type: "object",
            properties: {
                settings: {
                    type: "object",
                    description: "Key-value map of settings to update (e.g. { site_logo: 'https://...', site_logo_dark: 'https://...', footer_text: '© 2026' })"
                }
            },
            required: ["settings"]
        }
    },
    {
        name: "zygo_get_ai_crawl_settings",
        description: "Get Cloudflare AI Crawl Control edge settings (ai_bots_protection, ai_search, ai_training, ai_user).",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "zygo_update_ai_crawl_settings",
        description: "Update Cloudflare AI Crawl Control edge settings (ai_bots_protection, ai_search, ai_training, ai_user).",
        inputSchema: {
            type: "object",
            properties: {
                ai_bots_protection: { type: "string", enum: ["block", "disabled"] },
                ai_search: { type: "string", enum: ["block", "disabled"] },
                ai_training: { type: "string", enum: ["block", "disallow", "disabled"] },
                ai_user: { type: "string", enum: ["block", "disabled"] }
            }
        }
    },
    {
        name: "zygo_clear_cache",
        description: "Purge all cached public pages at the Cloudflare edge and rotate the stylesheet hash so browsers reload CSS. Admin only.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "zygo_list_redirects",
        description: "List all 301 and 302 redirects in Zygo CMS.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "zygo_create_redirect",
        description: "Create a 301 or 302 redirect or vanity marketing URL in Zygo CMS.",
        inputSchema: {
            type: "object",
            properties: {
                source_path: { type: "string", description: "Incoming URL path to redirect from (must start with '/')" },
                target_url: { type: "string", description: "Target URL destination or internal path" },
                status_code: { type: "number", description: "HTTP redirect status code (301 for permanent, 302 for temporary). Defaults to 301." },
                notes: { type: "string", description: "Optional notes or campaign context" }
            },
            required: ["source_path", "target_url"]
        }
    },
    {
        name: "zygo_update_redirect",
        description: "Update an existing redirect by ID in Zygo CMS.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "ID of the redirect to update" },
                source_path: { type: "string", description: "Incoming URL path to redirect from" },
                target_url: { type: "string", description: "Target URL destination or internal path" },
                status_code: { type: "number", description: "HTTP redirect status code (301 or 302)" },
                notes: { type: "string", description: "Optional notes or campaign context" }
            },
            required: ["id"]
        }
    },
    {
        name: "zygo_delete_redirect",
        description: "Delete a redirect by ID in Zygo CMS.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "ID of the redirect to delete" }
            },
            required: ["id"]
        }
    },
    {
        name: "zygo_list_form_submissions",
        description: "List contact and newsletter form submissions with optional filtering by status, form name, or search query.",
        inputSchema: {
            type: "object",
            properties: {
                status: {
                    type: "string",
                    enum: ["unread", "read", "archived"],
                    description: "Optional status filter ('unread', 'read', 'archived')"
                },
                form_name: {
                    type: "string",
                    description: "Optional form name to filter by (e.g. 'contact', 'newsletter')"
                },
                q: {
                    type: "string",
                    description: "Optional search query to match against sender name, email, subject, or message content"
                },
                page: {
                    type: "number",
                    description: "Page number (default: 1)"
                },
                per_page: {
                    type: "number",
                    description: "Number of results per page (default: 20)"
                }
            }
        }
    },
    {
        name: "zygo_get_form_submission",
        description: "Get full details of a specific form submission by numeric ID.",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    description: "The numeric ID of the form submission"
                }
            },
            required: ["id"]
        }
    },
    {
        name: "zygo_update_form_submission_status",
        description: "Update the status of a form submission ('unread', 'read', or 'archived').",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    description: "The numeric ID of the form submission"
                },
                status: {
                    type: "string",
                    enum: ["unread", "read", "archived"],
                    description: "New status for the submission ('unread', 'read', or 'archived')"
                }
            },
            required: ["id", "status"]
        }
    },
    {
        name: "zygo_delete_form_submission",
        description: "Permanently delete a form submission by numeric ID.",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    description: "The numeric ID of the form submission to delete"
                }
            },
            required: ["id"]
        }
    },
    // ==========================================
    // I. Site Backup (Export & Import)
    // ==========================================
    {
        name: "zygo_export_site_backup",
        description: "Export the full Zygo CMS site backup as a structured JSON object containing settings, menus, templates, entries, and redirects.",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "zygo_import_site_backup",
        description: "Import a Zygo CMS site backup JSON bundle into the CMS, with optional dry-run preview mode.",
        inputSchema: {
            type: "object",
            properties: {
                backup: {
                    type: "object",
                    description: "The site backup JSON object exported from Zygo CMS"
                },
                dry_run: {
                    type: "boolean",
                    description: "If true, validates schema and calculates item counts without persisting changes"
                },
                mode: {
                    type: "string",
                    enum: ["merge", "overwrite"],
                    description: "Import mode (merge or overwrite)"
                }
            },
            required: ["backup"]
        }
    }
];

// Register Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});

export async function handleCallTool(request, customContext = {}) {
    const activeUrl = customContext.url || url;
    const activeHeaders = {
        ...getHeaders(customContext.clientId, customContext.clientSecret, customContext.cookie),
        ...(customContext.headers || {})
    };
    const activeGetApiUrl = (path) => getApiUrl(path, activeUrl);

    try {
        // ==========================================
        // A. Entries (Posts, Pages, Docs)
        // ==========================================
        if (request.params.name === "zygo_list_entries") {
            const res = await fetch(activeGetApiUrl('/entries'), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            const entries = Array.isArray(data) ? data : (data.entries || []);
            const { type, status, search } = request.params.arguments || {};
            const filtered = entries.filter((entry) => {
                if (type && entry.type !== type) return false;
                if (status && entry.status !== status) return false;
                if (search) {
                    const q = String(search).toLowerCase();
                    const matchTitle = entry.title && String(entry.title).toLowerCase().includes(q);
                    const matchSlug = entry.slug && String(entry.slug).toLowerCase().includes(q);
                    if (!matchTitle && !matchSlug) return false;
                }
                return true;
            });
            return { toolResult: filtered, content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }] };
        }

        if (request.params.name === "zygo_get_entry") {
            const { id } = request.params.arguments || {};
            if (!id) throw new Error("Entry id is required");
            const res = await fetch(activeGetApiUrl('/entries'), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            const entries = Array.isArray(data) ? data : (data.entries || []);
            const entry = entries.find((e) => String(e.id) === String(id) || e.slug === id);
            if (!entry) {
                throw new Error(`Entry not found with id or slug: ${id}`);
            }
            const result = { ...entry };
            if (result.type === 'page' && result.body_json) {
                try {
                    result.sections = JSON.parse(result.body_json);
                } catch {
                    result.sections = [];
                }
            }
            return { toolResult: result, content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }

        if (request.params.name === "zygo_create_entry") {
            const args = request.params.arguments || {};
            if (!args.title || !args.slug || !args.type || !args.status) {
                throw new Error('Fields "title", "slug", "type", and "status" are required.');
            }
            const payload = {
                title: args.title,
                slug: args.slug,
                type: args.type,
                status: args.status,
                body_html: args.type === 'page' ? '' : (args.body_html || ''),
                body_json: args.type === 'page' ? (args.body_json || JSON.stringify(args.sections || [])) : (args.body_json || '{}'),
                description: args.description || '',
                category: args.category || '',
                tags: args.tags || ''
            };
            if (args.cover_image !== undefined) payload.cover_image = args.cover_image;
            if (args.canonical_url !== undefined) payload.canonical_url = args.canonical_url;
            if (args.parent_id !== undefined) payload.parent_id = args.parent_id;
            if (args.sort_order !== undefined) payload.sort_order = args.sort_order;

            const res = await fetch(activeGetApiUrl('/entries'), {
                method: "POST",
                headers: activeHeaders,
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_update_entry") {
            const args = request.params.arguments || {};
            if (!args.id) throw new Error("Entry id is required");
            const payload = { ...args };
            delete payload.id;
            if (args.type === 'page') {
                if (args.sections !== undefined) {
                    payload.body_json = JSON.stringify(args.sections);
                    payload.sections = args.sections;
                }
                payload.body_html = args.body_html ?? "";
            } else if (args.type === 'post' || args.type === 'doc') {
                payload.body_html = args.body_html ?? "";
                payload.body_json = args.body_json || "{}";
            }
            const res = await fetch(activeGetApiUrl(`/entries/${encodeURIComponent(args.id)}`), {
                method: "PUT",
                headers: activeHeaders,
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_delete_entry") {
            const { id } = request.params.arguments || {};
            if (!id) throw new Error("Entry id is required");
            const res = await fetch(activeGetApiUrl(`/entries/${encodeURIComponent(id)}`), {
                method: "DELETE",
                headers: activeHeaders
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            let data;
            try {
                data = await res.json();
            } catch {
                data = { success: true, id };
            }
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_restore_entry") {
            const { id } = request.params.arguments || {};
            if (!id) throw new Error("Entry id is required");
            const res = await fetch(activeGetApiUrl(`/entries/${encodeURIComponent(id)}/restore`), {
                method: "POST",
                headers: activeHeaders
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            let data;
            try {
                data = await res.json();
            } catch {
                data = { success: true, id };
            }
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_bulk_entries") {
            const { action, ids, tags } = request.params.arguments || {};
            if (!action || !ids || !Array.isArray(ids)) {
                throw new Error('Fields "action" and "ids" (array) are required.');
            }
            const payload = { action, ids };
            if (tags && Array.isArray(tags)) payload.tags = tags;
            const res = await fetch(activeGetApiUrl('/entries/bulk'), {
                method: "POST",
                headers: activeHeaders,
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        // Backward compatibility aliases
        if (request.params.name === "zygo_list_posts") {
            const res = await fetch(activeGetApiUrl('/posts'), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_read_post") {
            const { slug } = request.params.arguments || {};
            if (!slug) throw new Error("Post slug is required");
            const res = await fetch(activeGetApiUrl('/posts'), { headers: activeHeaders }); 
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const posts = await res.json();
            const post = (Array.isArray(posts) ? posts : []).find(p => p.slug === slug);
            if (!post) throw new Error(`Post not found with slug: ${slug}`);
            return { toolResult: post, content: [{ type: "text", text: JSON.stringify(post, null, 2) }] };
        }

        if (request.params.name === "zygo_upsert_post") {
            const args = request.params.arguments || {};
            const isUpdate = !!args.id;
            const endpoint = activeGetApiUrl(isUpdate ? `/entries/${encodeURIComponent(args.id)}` : '/entries');
            const method = isUpdate ? "PUT" : "POST";

            if (!args.body_json) {
                args.body_json = JSON.stringify({ type: "doc", content: [] });
            }

            const res = await fetch(endpoint, {
                method,
                headers: activeHeaders,
                body: JSON.stringify(args)
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        // ==========================================
        // B. Section & Layout Templates
        // ==========================================
        if (request.params.name === "zygo_list_section_templates") {
            const res = await fetch(activeGetApiUrl('/section-templates'), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_get_section_template") {
            const { id } = request.params.arguments || {};
            if (!id) throw new Error("Section template ID is required");
            const res = await fetch(activeGetApiUrl(`/section-templates/${encodeURIComponent(id)}`), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_upsert_section_template") {
            const args = request.params.arguments || {};
            if (!args.id) throw new Error("Section template ID is required");
            const payload = {
                id: args.id,
                name: args.name || '',
                template_html: args.template_html ?? args.markup ?? '',
                schema_json: args.schema_json ?? args.schema ?? '[]',
                template_css: args.template_css ?? args.styles ?? '',
                description: args.description || '',
                category: args.category || ''
            };
            const res = await fetch(activeGetApiUrl(`/section-templates/${encodeURIComponent(args.id)}`), {
                method: "POST",
                headers: activeHeaders,
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_delete_section_template") {
            const { id } = request.params.arguments || {};
            if (!id) throw new Error("Section template ID is required");
            const res = await fetch(activeGetApiUrl(`/section-templates/${encodeURIComponent(id)}`), {
                method: "DELETE",
                headers: activeHeaders
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            let data;
            try {
                data = await res.json();
            } catch {
                data = { success: true, id };
            }
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_list_layout_templates") {
            const res = await fetch(activeGetApiUrl('/layout-templates'), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_get_layout_template") {
            const { id } = request.params.arguments || {};
            if (!id) throw new Error("Layout template ID is required");
            const res = await fetch(activeGetApiUrl(`/layout-templates/${encodeURIComponent(id)}`), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_update_layout_template") {
            const { id, template_html, template_css } = request.params.arguments || {};
            if (!id) throw new Error("Layout template ID is required");
            const payload = {};
            if (template_html !== undefined) payload.template_html = template_html;
            if (template_css !== undefined) payload.template_css = template_css;
            const res = await fetch(activeGetApiUrl(`/layout-templates/${encodeURIComponent(id)}`), {
                method: "PUT",
                headers: activeHeaders,
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        // ==========================================
        // C. Navigation Menus
        // ==========================================
        if (request.params.name === "zygo_get_menu") {
            const menuName = request.params.arguments?.name || request.params.arguments?.slug || 'header';
            const res = await fetch(activeGetApiUrl(`/menus/${encodeURIComponent(menuName)}`), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_update_menu") {
            const { items } = request.params.arguments || {};
            if (!items || !Array.isArray(items)) {
                throw new Error('Fields "items" (array) are required.');
            }
            const menuName = request.params.arguments?.name || request.params.arguments?.slug || 'header';
            const res = await fetch(activeGetApiUrl(`/menus/${encodeURIComponent(menuName)}`), {
                method: "PUT",
                headers: activeHeaders,
                body: JSON.stringify({ items, items_json: JSON.stringify(items) })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            let data;
            try {
                data = await res.json();
            } catch {
                data = { success: true, name: menuName, items };
            }
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        // ==========================================
        // D. Media & Themes
        // ==========================================
        if (request.params.name === "zygo_list_media") {
            const { page, limit, query } = request.params.arguments || {};
            const params = new URLSearchParams();
            if (page != null) params.set("page", String(page));
            if (limit != null) params.set("limit", String(limit));
            if (query != null) params.set("query", String(query));
            const qs = params.toString() ? `?${params.toString()}` : "";
            const res = await fetch(activeGetApiUrl(`/media${qs}`), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_delete_media") {
            const { key } = request.params.arguments || {};
            if (!key) throw new Error("Media key is required");
            const cleanKey = String(key).replace(/^\//, '');
            const res = await fetch(activeGetApiUrl(`/media/${cleanKey}`), {
                method: "DELETE",
                headers: activeHeaders
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            let data;
            try {
                data = await res.json();
            } catch {
                data = { success: true, key };
            }
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_get_theme_settings") {
            const res = await fetch(activeGetApiUrl('/settings'), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const allSettings = await res.json();
            return { toolResult: allSettings, content: [{ type: "text", text: JSON.stringify(allSettings, null, 2) }] };
        }

        if (request.params.name === "zygo_update_theme_settings") {
            const args = request.params.arguments || {};
            const settings = args.settings || {};
            if (args.theme_css !== undefined) settings.theme_css = args.theme_css;
            if (args.active_preset !== undefined) settings.active_preset = args.active_preset;
            if (Object.keys(settings).length === 0) {
                throw new Error("Theme settings are required");
            }
            const res = await fetch(activeGetApiUrl('/settings'), {
                method: "POST",
                headers: activeHeaders,
                body: JSON.stringify({ settings })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            let data;
            try {
                data = await res.json();
            } catch {
                data = { success: true, settings };
            }
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_reset_theme_to_defaults") {
            const res = await fetch(activeGetApiUrl('/settings'), {
                method: "POST",
                headers: activeHeaders,
                body: JSON.stringify({ settings: { theme_css: "" } })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            let data;
            try {
                data = await res.json();
            } catch {
                data = { success: true, reset: true };
            }
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_list_themes") {
            const [themesRes, settingsRes] = await Promise.all([
                fetch(activeGetApiUrl('/themes'), { headers: activeHeaders }),
                fetch(activeGetApiUrl('/settings'), { headers: activeHeaders })
            ]);
            if (!themesRes.ok) throw new Error(`HTTP ${themesRes.status}: ${await themesRes.text()}`);
            const themes = await themesRes.json();
            let settings = {};
            if (settingsRes.ok) {
                try {
                    settings = await settingsRes.json();
                } catch {
                    settings = {};
                }
            }
            const themePrimaryId = settings.theme_primary_id ||
                (Array.isArray(themes) ? themes.find((t) => t.name === settings.theme_active_name)?.id : undefined) ||
                (Array.isArray(themes) && themes.length > 0 ? themes[0].id : "modern-editorial");
            const themeDarkId = settings.theme_dark_id?.trim() || null;
            const data = { themes, themePrimaryId, themeDarkId };
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_get_theme") {
            const args = request.params.arguments || {};
            if (!args.id) throw new Error("Theme ID is required");
            const res = await fetch(activeGetApiUrl(`/themes/${encodeURIComponent(args.id)}`), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_create_theme") {
            const args = request.params.arguments || {};
            if (!args.name) throw new Error("Theme name is required");
            const payload = {
                name: args.name,
                description: args.description || undefined,
                baseThemeId: args.baseThemeId || undefined,
                base_theme_id: args.baseThemeId || undefined,
                tokens: args.tokens || undefined
            };
            const res = await fetch(activeGetApiUrl('/themes'), {
                method: "POST",
                headers: activeHeaders,
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_activate_theme") {
            const args = request.params.arguments || {};
            if (!args.role) throw new Error("Role is required ('primary' or 'dark')");
            const res = await fetch(activeGetApiUrl('/themes/activate'), {
                method: "PUT",
                headers: activeHeaders,
                body: JSON.stringify({
                    id: args.id ?? null,
                    role: args.role
                })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_duplicate_theme") {
            const args = request.params.arguments || {};
            if (!args.id) throw new Error("Theme ID is required");
            const res = await fetch(activeGetApiUrl(`/themes/${encodeURIComponent(args.id)}/duplicate`), {
                method: "POST",
                headers: activeHeaders
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_rename_theme") {
            const args = request.params.arguments || {};
            if (!args.id) throw new Error("Theme ID is required");
            if (!args.name) throw new Error("Theme name is required");
            const res = await fetch(activeGetApiUrl(`/themes/${encodeURIComponent(args.id)}/rename`), {
                method: "PUT",
                headers: activeHeaders,
                body: JSON.stringify({ name: args.name })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_delete_theme") {
            const args = request.params.arguments || {};
            if (!args.id) throw new Error("Theme ID is required");
            const res = await fetch(activeGetApiUrl(`/themes/${encodeURIComponent(args.id)}`), {
                method: "DELETE",
                headers: activeHeaders
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            let data = { success: true };
            try {
                data = await res.json();
            } catch {}
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
        // ==========================================
        if (request.params.name === "zygo_get_settings") {
            const res = await fetch(activeGetApiUrl('/settings'), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_update_settings") {
            const { settings } = request.params.arguments || {};
            const res = await fetch(activeGetApiUrl('/settings'), {
                method: "POST",
                headers: activeHeaders,
                body: JSON.stringify({ settings: settings || {} })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_get_ai_crawl_settings") {
            const res = await fetch(activeGetApiUrl('/cloudflare/ai-crawl'), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_update_ai_crawl_settings") {
            const args = request.params.arguments || {};
            const res = await fetch(activeGetApiUrl('/cloudflare/ai-crawl'), {
                method: "PUT",
                headers: activeHeaders,
                body: JSON.stringify(args)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_clear_cache") {
            const res = await fetch(activeGetApiUrl('/cache/clear'), { method: "POST", headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_list_redirects") {
            const res = await fetch(activeGetApiUrl('/redirects'), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_create_redirect") {
            const { source_path, target_url, status_code = 301, notes } = request.params.arguments || {};
            const res = await fetch(activeGetApiUrl('/redirects'), {
                method: "POST",
                headers: activeHeaders,
                body: JSON.stringify({
                    source_path,
                    target_url,
                    status_code: Number(status_code) || 301,
                    notes: notes || null
                })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_update_redirect") {
            const { id, source_path, target_url, status_code, notes } = request.params.arguments || {};
            if (!id) throw new Error("Redirect ID is required");
            const payload = {};
            if (source_path !== undefined) payload.source_path = source_path;
            if (target_url !== undefined) payload.target_url = target_url;
            if (status_code !== undefined) payload.status_code = Number(status_code);
            if (notes !== undefined) payload.notes = notes;

            const res = await fetch(activeGetApiUrl(`/redirects/${id}`), {
                method: "PUT",
                headers: activeHeaders,
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_delete_redirect") {
            const { id } = request.params.arguments || {};
            if (!id) throw new Error("Redirect ID is required");
            const res = await fetch(activeGetApiUrl(`/redirects/${id}`), {
                method: "DELETE",
                headers: activeHeaders
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_list_form_submissions") {
            const { status, form_name, q, page, per_page } = request.params.arguments || {};
            const params = new URLSearchParams();
            if (status) params.set("status", String(status));
            if (form_name) params.set("form_name", String(form_name));
            if (q) params.set("q", String(q));
            if (page != null) params.set("page", String(page));
            if (per_page != null) params.set("per_page", String(per_page));
            const qs = params.toString() ? `?${params.toString()}` : "";
            const res = await fetch(activeGetApiUrl(`/submissions${qs}`), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_get_form_submission") {
            const { id } = request.params.arguments || {};
            const numId = Number(id);
            if (isNaN(numId) || numId <= 0) throw new Error("A valid numeric id is required");
            const res = await fetch(activeGetApiUrl(`/submissions/${numId}`), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_update_form_submission_status") {
            const { id, status } = request.params.arguments || {};
            const numId = Number(id);
            if (isNaN(numId) || numId <= 0) throw new Error("A valid numeric id is required");
            if (!status || !["unread", "read", "archived"].includes(status)) {
                throw new Error("Status must be one of 'unread', 'read', or 'archived'");
            }
            const res = await fetch(activeGetApiUrl(`/submissions/${numId}`), {
                method: "PUT",
                headers: activeHeaders,
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_delete_form_submission") {
            const { id } = request.params.arguments || {};
            const numId = Number(id);
            if (isNaN(numId) || numId <= 0) throw new Error("A valid numeric id is required");
            const res = await fetch(activeGetApiUrl(`/submissions/${numId}`), {
                method: "DELETE",
                headers: activeHeaders
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            let data;
            try {
                data = await res.json();
            } catch {
                data = { success: true, id: numId };
            }
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        // ==========================================
        // I. Site Backup (Export & Import)
        // ==========================================
        if (request.params.name === "zygo_export_site_backup") {
            const res = await fetch(activeGetApiUrl('/admin/export'), { headers: activeHeaders });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        if (request.params.name === "zygo_import_site_backup") {
            const args = request.params.arguments || {};
            if (!args.backup) {
                throw new Error("Backup object is required");
            }
            const res = await fetch(activeGetApiUrl('/admin/import'), {
                method: "POST",
                headers: activeHeaders,
                body: JSON.stringify({
                    backup: args.backup,
                    dry_run: args.dry_run ?? false,
                    mode: args.mode
                })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = await res.json();
            return { toolResult: data, content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        throw new Error(`Unknown tool: ${request.params.name}`);
    } catch (e) {
        return { isError: true, content: [{ type: "text", text: e.message }] };
    }
}

server.setRequestHandler(CallToolRequestSchema, (request) => handleCallTool(request));

// Run Server
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`Zygo MCP Server running. Connected to ${url}`);
}

if (isDirectRun) {
    run().catch(console.error);
}
