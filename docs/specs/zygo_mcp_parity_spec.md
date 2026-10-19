# Backend CLI MCP Server (`zygo-mcp`) Parity & Upgrade Spec

## 1. Problem Statement & Motivation

Zygo CMS supports two complementary Model Context Protocol (MCP) surfaces for AI agents:
1. **In-Browser WebMCP (`packages/admin-ui/src/lib/webmcp/`)**: Runs inside the Admin UI browser session (`window.webmcp` & `navigator.modelContext`) for human-in-the-loop co-authoring.
2. **Backend CLI MCP Bridge (`packages/zygo-mcp/index.mjs`)**: Runs as a stdio MCP server for external desktop/CLI agents (Claude Desktop, Cursor, automated workflows) authenticating via Cloudflare Access Service Tokens (`CF-Access-Client-Id` / `CF-Access-Client-Secret`).

While in-browser WebMCP has been continuously expanded to cover pages, sections, templates, themes, menus, and bulk operations, [`packages/zygo-mcp/index.mjs`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/zygo-mcp/index.mjs) has fallen out of sync with the current [`packages/admin-api-worker`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-api-worker/src/lib.rs) architecture:
- **Broken Route Prefixes**: `zygo-mcp` calls `${url}/posts` and `${url}/entries`, which return `404 Not Found` because all REST API routes now require the `/api/` prefix (`/api/posts`, `/api/entries`).
- **Outdated `body_json` Data Model**: `zygo-mcp` still assumes `body_json` is a ProseMirror/TipTap AST (`{"type":"doc","content":[]}`). In the current Zygo CMS data model ([`entryForm.ts`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Editor/utils/entryForm.ts#L68-L69)), **Posts** store rich text in `body_html` (`body_json: "{}"`), whereas **Pages** store an array of section instances (`[{"type": "hero", "data": {...}}]`) in `body_json` (`body_html: ""`).
- **Missing Resource Tools**: `zygo-mcp` only exposes 3 post tools (`zygo_list_posts`, `zygo_read_post`, `zygo_upsert_post`) and lacks tools for Pages & Sections, Section Templates, Layout Templates, Navigation Menus, Media, Bulk Operations, and Site Settings.

---

## 2. Goals & Requirements

1. **Fix Endpoint Routing & Payload Contracts**:
   - Prefix all REST requests in [`packages/zygo-mcp/index.mjs`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/zygo-mcp/index.mjs) with `/api/`.
   - Align entry creation/update payloads with [`buildEntryPayload`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Editor/utils/entryForm.ts#L50-L76):
     - For `post` and `doc` entries: populate `body_html` and set `body_json` to `"{}"`.
     - For `page` entries: serialize the `sections` array into `body_json` and set `body_html` to `""`.
2. **Full Resource Parity with WebMCP Global Tools**:
   - **Entries (Posts, Pages, Docs)**:
     - `zygo_list_entries` (filterable by `type`, `status`, search query)
     - `zygo_get_entry` (by ID or slug, returning full content/sections and metadata)
     - `zygo_create_entry` / `zygo_update_entry` (supporting `sections` array for pages and `body_html` for posts/docs)
     - `zygo_delete_entry` (soft-delete to Trash) & `zygo_restore_entry`
     - `zygo_bulk_entries` (`publish`, `unpublish`, `trash`, `add_tags`, `remove_tags`)
   - **Section & Layout Templates**:
     - `zygo_list_section_templates`, `zygo_get_section_template`, `zygo_upsert_section_template`, `zygo_delete_section_template`
     - `zygo_list_layout_templates`, `zygo_get_layout_template`, `zygo_update_layout_template`
   - **Navigation Menus**:
     - `zygo_get_menus`, `zygo_update_menu`
   - **Media & Settings**:
     - `zygo_list_media`, `zygo_delete_media`
     - `zygo_get_settings`, `zygo_update_settings`
3. **Ongoing Dual-MCP Parity Policy (`AGENTS.md`)**:
   - Any feature or API change must update **both** in-browser WebMCP (`packages/admin-ui/src/lib/webmcp/`) and the backend CLI MCP bridge (`packages/zygo-mcp/`).
4. **Automated Test Suite**:
   - Add Vitest unit/integration tests for `packages/zygo-mcp` validating tool registration, input schemas, and `/api/*` request formatting.
