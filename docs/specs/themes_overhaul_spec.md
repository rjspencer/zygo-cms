# Specification: Themes Architecture Overhaul & Dual-Mode System

- **Author**: Antigravity Pair Programmer
- **Date**: 2026-10-24
- **Status**: Implemented
- **Related Issues**: Themes Overhaul, Dual-Mode Theming, Strict Logo Sync

---

## 1. Overview & Motivation

Historically, Zygo CMS stored active theme styling as flattened key-value pairs or serialized JSON in the `settings` table (`theme_active_name`, `theme_custom_themes`). As theming capabilities grew, this approach presented several limitations:
1. **Lack of Relational Modeling**: Themes could not be independently queried, indexed, or referenced cleanly across decoupled workers.
2. **Missing Dark Mode Pairing**: Visitors with dark mode preference could not be served an intentionally crafted dark palette alongside a primary light theme.
3. **Logo Inconsistencies**: Dark-mode logos used rigid CSS media queries inside `<picture>` elements without synchronizing with visitor manual theme overrides.
4. **Monolithic Admin View**: The admin UI bundled theme listing and deep token editing into a single screen without breadcrumbs or standard CRUD operations.

This overhaul transitions Zygo CMS to a first-class D1 database table (`themes`), implements dedicated list (`/theme`) and editor (`/theme/editor/:id`) routes, enables optional Primary Theme + Dark Mode Variant pairing, renders zero-FOUC visitor theme controls, and synchronizes logo presentation strictly with active theme state.

---

## 2. Architecture & Data Model

### 2.1 Database Schema (`migrations/0014_themes_table.sql`)

```sql
CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    tokens_json TEXT NOT NULL,
    is_locked INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

- **Built-in Presets (`is_locked = 1`)**:
  - `modern-editorial`: Modern Editorial typography with warm cream tones.
  - `bento-brutalism`: Clean brutalist borders with sharp contrast.
  - `bento-brutalism-dark`: High-contrast dark variant with glowing cyan accents.
- **Active Role Settings**:
  - `theme_primary_id`: Primary theme ID (defaults to `'modern-editorial'`).
  - `theme_dark_id`: Optional dark mode variant theme ID (or `NULL` if locked to primary).
  - `theme_active_name`: Backward-compatibility fallback storing the primary theme's human-readable name.

### 2.2 Core Models (`zygo-core`)

- `Theme`: Represents a theme record with strongly-typed `ThemeTokens`, boolean `is_locked`, and ISO timestamps.
- `ThemeTokens`: Stores typography URLs, headline/body font stacks, colors (`colorBg`, `colorSurface`, `colorText`, `colorTextMuted`, `colorAccent`, `colorBorder`), header layout, and geometry tokens.
- `ThemeTokens::resolve_from_settings`: Resolves active primary tokens, falling back from `theme_primary_id` to `theme_active_name` and built-in defaults.

---

## 3. Worker Implementations

### 3.1 Admin API Worker (`packages/admin-api-worker`)

- Standalone handlers in `src/handlers/themes.rs`, guarded by `auth_required!`:
  - `GET /api/themes`: Lists all themes.
  - `GET /api/themes/:id`: Fetches theme by ID.
  - `POST /api/themes`: Creates custom theme (`is_locked = 0`).
  - `PUT /api/themes/:id`: Updates custom theme tokens (rejects locked presets with 403 Forbidden).
  - `PUT /api/themes/:id/rename`: Renames theme (rejects locked presets with 403 Forbidden).
  - `POST /api/themes/:id/duplicate`: Duplicates preset or custom theme with sequential naming (`<name> copy`).
  - `DELETE /api/themes/:id`: Deletes custom theme (rejects locked presets with 403; rejects active themes with 400).
  - `PUT /api/themes/activate`: Atomically sets `role: "primary"` or `role: "dark"` (or clears dark variant).
- **Cache Invalidation**: On all theme mutations, `recompute_and_purge` is triggered to recompute `styles_hash` and purge Cloudflare edge caches.

### 3.2 Public SSR Worker (`packages/public-worker`)

- **Root CSS Emission**:
  - Emits primary tokens on `:root, :root[data-theme="light"]`.
  - When `theme_dark_id` is configured, emits dark tokens on `:root[data-theme="dark"]` and `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }`.
- **Zero-FOUC Script**:
  - Injects synchronous inline script in `<head>` inspecting `localStorage.getItem('zygo_theme')` to set `document.documentElement.dataset.theme`.
- **Visitor Theme Switcher**:
  - Renders accessible 3-way toggle (`Auto`, `Light`, `Dark`) in header navigation when a dark theme is configured.
- **Strict Logo Display**:
  - Emits `.site-logo-light` and `.site-logo-dark` img elements.
  - CSS switches visibility based on active theme mode and user preference, preventing mismatched logo colors.

---

## 4. Admin UI Experience (`packages/admin-ui`)

- **/theme (Themes List)**:
  - Header with `[Create Theme]` button.
  - Side-by-side active cards for **Primary Theme** and **Dark Mode Variant** (with `[Remove]` button).
  - Themes table with color swatch previews, built-in vs custom tags, and action dialogs (`[Activate]`, `[Rename]`, `[Duplicate]`, `[Edit]`, `[Delete]`).
- **/theme/editor/:id (Dedicated Token Editor)**:
  - Breadcrumb navigation back to `/theme`.
  - Locked badge and `[Duplicate to Edit]` button for built-in presets.
  - Direct token controls and live editorial preview for custom themes.
  - Integration with `UnsavedChangesDialog`.

---

## 5. WebMCP & CLI MCP Parity

Full parity achieved across browser WebMCP (`packages/admin-ui/src/lib/webmcp/themeAndMediaTools.ts`) and CLI MCP (`packages/zygo-mcp/index.mjs`):
- `theme_list` / `zygo_list_themes`
- `theme_get` / `zygo_get_theme`
- `theme_create` / `zygo_create_theme`
- `theme_activate` / `zygo_activate_theme`
- `theme_duplicate` / `zygo_duplicate_theme`
- `theme_rename` / `zygo_rename_theme`
- `theme_delete` / `zygo_delete_theme`
