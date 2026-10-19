# 1-Click Site Backup, Export & Import Spec

## 1. Problem Statement & Motivation

One common concern when adopting a database-backed CMS (Cloudflare D1 SQLite) over a Git-backed static site generator is **data portability and backup safety**.

Providing a built-in **1-Click Site Export & Import** tool in the Admin UI gives individuals and small businesses peace of mind that:
1. They can download a complete, human-readable JSON/Markdown snapshot of their entire website at any time before making major changes.
2. They can migrate content between local development (`wrangler dev`) and production (or to a new domain) without running raw SQL commands.
3. They are never locked into Zygo CMS.

---

## 2. Architecture & Design

### 2.1 Portable Zygo Archive Format (`zygo-backup-YYYY-MM-DD.json`)
The export endpoint (`GET /api/admin/export`) generates a single structured, versioned JSON bundle containing all database-backed site state:
```json
{
  "version": "1.0",
  "exported_at": "2026-10-18T17:25:00Z",
  "settings": { ... },
  "menus": [ ... ],
  "section_templates": [ ... ],
  "layout_templates": [ ... ],
  "entries": [ ... ],
  "redirects": [ ... ],
  "media_manifest": [
    {
      "key": "1726700000000-hero.webp",
      "filename": "hero.webp",
      "mime_type": "image/webp",
      "size_bytes": 142000,
      "url": "/media/1726700000000-hero.webp"
    }
  ]
}
```
*(All queries used to assemble the export strictly list explicit column names per `AGENTS.md`—no `SELECT *`.)*

### 2.2 Admin API Endpoints (`packages/admin-api-worker`)
1. **`GET /api/admin/export` (Admin Role Required)**:
   - Queries `settings`, `menus`, `section_templates`, `layout_templates`, `entries` (including hierarchy preserved via slugs/IDs), `redirects`, and `media` metadata.
   - Returns the JSON payload with `Content-Disposition: attachment; filename="zygo-backup-YYYY-MM-DD.json"`.
2. **`POST /api/admin/import` (Admin Role Required)**:
   - Accepts a backup JSON payload with an optional `mode` (`merge` vs. `overwrite`) and `dry_run: boolean`.
   - Validates all schemas (including MiniJinja template compilation check via `zygo-core::validate_template`) before committing to D1.
   - Upserts settings, menus, templates, entries (re-linking `parent_id` relationships by slug), and redirects, then purges the edge cache.

### 2.3 Admin UI Integration (`packages/admin-ui/src/pages/Settings/`)
- Add a **Backup & Portability** card in [`Settings.tsx`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/pages/Settings/Settings.tsx) containing:
  - **Export Site Data**: 1-click button that downloads `zygo-backup-YYYY-MM-DD.json`.
  - **Import / Restore Snapshot**: File picker with a preview/dry-run summary showing how many pages, posts, templates, menus, and settings will be created or updated before the user confirms the import.

### 2.4 Dual MCP & WebMCP Parity
- Expose `export_site_backup` and `import_site_backup` (with `dry_run` support) in both `packages/admin-ui/src/lib/webmcp/` and `packages/zygo-mcp/index.mjs`.
