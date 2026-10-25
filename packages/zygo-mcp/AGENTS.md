# Zygo MCP Server Guidelines

## Core Principles

- **WebMCP Parity**: Maintain strict feature and schema parity with in-browser WebMCP (`packages/admin-ui/src/lib/webmcp/`). When backend REST API endpoints (`/api/*`), content models (like Page Sections), or CMS actions are added or updated, update both WebMCP and `packages/zygo-mcp/index.mjs`. Use the parity audit skill in `.agents/skills/webmcp-parity-audit/SKILL.md`.
- **Tool Naming Convention**: All CLI MCP tools MUST use the `zygo_` prefix (e.g., `zygo_list_entries`, `zygo_create_entry`, `zygo_update_entry`).
- **Return Structured Content**: Every tool handler MUST return `{ toolResult: ..., content: [{ type: "text", text: ... }] }` with informative human/agent readable text, and catch errors returning `{ isError: true, content: [{ type: "text", text: error.message }] }`.
- **Strict Input Schemas**: Every tool must declare a strict JSON schema for input parameters, with explicit types, descriptions, enums where appropriate, and required fields.
- **Endpoint Routing**: All backend requests route through `/api/*` REST endpoints using `getApiUrl()` and Cloudflare Access Service Token authentication headers (`CF-Access-Client-Id` and `CF-Access-Client-Secret`).

---

## Supported Tools Summary

### 1. Entries & Content (Posts, Pages, Docs)
- `zygo_list_entries`: List posts, pages, or docs with optional filtering by `type` (`post`, `page`, `doc`), `status` (`draft`, `published`, `scheduled`), or `search` query matching title/slug.
- `zygo_get_entry`: Retrieve full details for an entry by UUID id or slug. For `page` entries, automatically parses `body_json` into a convenient `sections` array.
- `zygo_create_entry`: Create a new entry (`post`, `page`, or `doc`). Normalizes page sections into `body_json` or sets `body_html` for posts/docs.
- `zygo_update_entry`: Update an existing entry by UUID id. Supports partial updates, section updates, status transitions, and metadata.
- `zygo_delete_entry`: Soft-delete an entry to Trash by UUID id.
- `zygo_restore_entry`: Restore a soft-deleted entry from Trash by UUID id.
- `zygo_bulk_entries`: Execute batch operations across entries: `publish`, `unpublish`, `trash`, `add_tags`, `remove_tags`.
- **Legacy Compatibility Aliases**: `zygo_list_posts`, `zygo_read_post`, `zygo_upsert_post`.

### 2. Section & Layout Templates
- `zygo_list_section_templates`: List all custom and built-in MiniJinja section templates.
- `zygo_get_section_template`: Fetch full details, field schema, template markup, and CSS styles for a section template by ID.
- `zygo_upsert_section_template`: Create or update a section template (markup HTML, styles CSS, field schema JSON, category, name).
- `zygo_delete_section_template`: Delete a custom section template by ID.
- `zygo_list_layout_templates`: List layout shell templates (`docs`, `posts`, `page`).
- `zygo_get_layout_template`: Retrieve layout template definition by ID (`docs`, `posts`, `page`).
- `zygo_update_layout_template`: Update HTML or CSS markup for a layout template by ID.

### 3. Navigation Menus
- `zygo_get_menu`: Retrieve menu items for navigation menu by name (`header` or `footer`).
- `zygo_update_menu`: Update menu items array (`title`, `url`, `openInNewTab`, `children`, etc.) for `header` or `footer`.

### 4. Media & Theming
- `zygo_list_media`: List uploaded media files stored in Cloudflare R2.
- `zygo_delete_media`: Permanently delete a media object by key from R2.
- `zygo_list_themes`: List all themes (presets and custom) with active primary and dark role indicators.
- `zygo_get_theme`: Retrieve full theme record and design tokens by theme ID.
- `zygo_create_theme`: Create a new custom theme preset.
- `zygo_activate_theme`: Set active primary theme or dark mode variant (or clear dark variant).
- `zygo_duplicate_theme`: Duplicate an existing theme to create an editable custom copy.
- `zygo_rename_theme`: Rename a custom theme.
- `zygo_delete_theme`: Delete an unassigned custom theme.
- `zygo_get_theme_settings`: Fetch active theme settings, design tokens, and custom CSS overrides.
- `zygo_update_theme_settings`: Update custom theme CSS or active preset.
- `zygo_reset_theme_to_defaults`: Reset theme styling back to default configuration.

### 5. Settings, Cache & SEO
- `zygo_get_settings`: Retrieve site-wide settings (branding, logos, favicon, OG images, canonical origin, footer).
- `zygo_update_settings`: Update site-wide key-value settings map.
- `zygo_get_ai_crawl_settings`: Get Cloudflare AI Crawl Control edge settings (`ai_bots_protection`, `ai_search`, `ai_training`, `ai_user`).
- `zygo_update_ai_crawl_settings`: Update Cloudflare AI Crawl Control edge settings.
- `zygo_clear_cache`: Purge edge cache and rotate stylesheet cache hash.

### 6. Redirects
- `zygo_list_redirects`: List all 301 and 302 URL redirects.
- `zygo_create_redirect`: Create a new 301/302 redirect.
- `zygo_update_redirect`: Update an existing redirect by ID.
- `zygo_delete_redirect`: Delete a redirect by ID.

### 7. Form Submissions
- `zygo_list_form_submissions`: Query form submissions with filtering by status, form name, search, and pagination.
- `zygo_get_form_submission`: Retrieve a form submission by numeric ID.
- `zygo_update_form_submission_status`: Update submission status (`unread`, `read`, `archived`).
- `zygo_delete_form_submission`: Delete a form submission by numeric ID.
