# Development & Advanced

For contributors and developers looking to extend the core capabilities of Zygo CMS.

## Writing Custom Rust Logic (`worker-rs`)

Zygo CMS is powered by Cloudflare Workers written in Rust using the `worker-rs` crate. The core logic is housed in `packages/core`, and the workers are in `packages/public-worker` and `packages/admin-api-worker`, alongside the `packages/admin-ui` dashboard.

### Routing and Handlers
- **Modular Handlers:** Never add inline closures to the main `Router` in `src/lib.rs`. All new routes must be implemented as standalone functions in the appropriate `src/handlers/` module (e.g., `admin.rs`, `api.rs`, or `public.rs`).
- **API Prefix:** All JSON-returning API endpoints must be prefixed with `/api/` (e.g., `/api/entries`).

### Side Effects and Background Tasks
- **No `wait_until` on `RouteContext`:** In `worker-rs`, `wait_until` exists only on the top-level `worker::Context`, not on router closures (`RouteContext<D>`).
- Implement async side-effects (e.g., cache invalidation, webhooks) as `async fn` taking `&worker::Env` and await them directly in your route handlers.

### D1 Bindings and Optional Values
- **Binding Nullable / Optional Values:** Always bind SQL `NULL` using `JsValue::null()`, never JavaScript `undefined`.
- Recommended pattern:
  ```rust
  fn opt_js(val: &Option<String>) -> JsValue {
      val.as_deref().map(JsValue::from).unwrap_or_else(JsValue::null)
  }
  ```

### Database Queries and Models
- **Database Queries:** Located in `packages/core/src/db`. Ensure all queries use prepared statements and explicitly name columns instead of using `SELECT *`.
- **Models:** Defined in `packages/core/src/models`. We utilize `serde` heavily. Ensure new fields include `#[serde(default)]` to maintain backwards compatibility across workers during deployment rollouts.

## Template Architecture (MiniJinja & `template-wasm`)

Zygo CMS uses a unified, dynamic templating pipeline across both server and client:

### Edge SSR with Dynamic MiniJinja
Edge rendering in `packages/public-worker` is powered by dynamic **MiniJinja** (a lightweight Jinja2-compatible template engine for Rust):
- **Embedded Default Templates:** Built-in default templates for layouts and standard sections are embedded directly in the worker binary via `packages/public-worker/src/views.rs`.
- **Runtime D1 Overrides:** At runtime, the public worker queries the D1 database for custom templates in the `layout_templates` and `section_templates` tables. When a database record exists, it dynamically overrides the embedded default without requiring worker recompilation or redeployment.
- **No Disk Templates:** There is no reliance on on-disk template directories (such as a `templates/` folder) or compile-time static template engines like Askama. Templates are dynamic, stored in D1, and evaluated in-memory by MiniJinja.
- **Shared `media_srcset` Filter:** Registered in `packages/core/src/template_engine.rs` (available to both Public SSR and Wasm preview), `{{ image|media_srcset|safe }}` automatically generates responsive `srcset` attributes for uploaded WebP media assets (`/media/{key}.webp` or `/api/media/{key}.webp`), outputting:
  `{url}?size=thumb 400w, {url}?size=md 1024w, {url} 2048w`. Non-WebP assets or external URLs safely return an empty string. Example usage in section templates:
  ```html
  <img src="{{ image }}" srcset="{{ image|media_srcset|safe }}" sizes="(max-width: 768px) 100vw, 1024px" alt="{{ title }}" loading="lazy" />
  ```

### Client-Side Live Preview with `template-wasm`
Live previewing in the Admin UI is powered by **`template-wasm`** (`packages/template-wasm`), a dedicated Rust WebAssembly crate:
- **Client-Side Evaluation:** Compiles MiniJinja to Wasm so the Vite / React frontend can evaluate and render templates client-side directly in the browser.
- **Zero Server Round-Trips:** As editors customize section data or developers modify section HTML/CSS templates in the Template Editor, `template-wasm` renders live previews instantly with 100% parity to the Edge SSR engine.

## MCP & Agent Parity Architecture (WebMCP & `zygo-mcp`)

Zygo CMS enforces a mandatory **Human-Agent Parity Gate**: any feature, REST API endpoint, or editing capability added to `packages/admin-ui` or `packages/admin-api-worker` must be fully usable by AI agents through both **in-browser WebMCP** (`packages/admin-ui/src/lib/webmcp/`) and the standalone **CLI MCP bridge** (`packages/zygo-mcp/index.mjs`).

### 1. Dual-Bridge Architecture

Agent interaction is split across two synchronized runtimes:

- **In-Browser WebMCP (`packages/admin-ui/src/lib/webmcp/`):**
  - **Standard Global Bridges:** Every tool registered in the UI is bound synchronously to both `window.webmcp` and the emerging W3C standard `navigator.modelContext` (`registerTool`, `unregisterTool`, `provideContext`, `executeTool`).
  - **Live Editor State Synchronization:** Tool handlers integrate directly with active React components, React Hook Form instances, TipTap rich text, and page section arrangements via `EditorUIStateContext`. When an agent invokes a tool (e.g. `editor_set_sections` or `editor_save_draft`), the active UI updates immediately, avoiding stale closures and resetting unsaved-change indicators (`isDirty`).
  - **Same-Tick Sequential Mutation Safety:** Handlers updating state arrays or objects synchronously mirror mutations to `optionsRef.current` alongside React state setters (`opts.setSections(next)`), ensuring sequential or batch tool calls within the same render tick do not overwrite each other.

- **CLI MCP Bridge (`packages/zygo-mcp/index.mjs`):**
  - A standalone Model Context Protocol stdio server providing 37 tools prefixed with `zygo_` (e.g., `zygo_list_entries`, `zygo_create_entry`, `zygo_bulk_entries`, `zygo_upsert_section_template`, `zygo_update_theme_settings`, `zygo_list_form_submissions`, `zygo_clear_cache`).
  - Connects to `/api/*` endpoints authenticated via Cloudflare Access Service Tokens (`CF-Access-Client-Id` and `CF-Access-Client-Secret`).

### 2. Structured Return Contract

Every MCP tool across both WebMCP and `zygo-mcp` adheres to a strict return contract:

```typescript
return {
  toolResult: data, // Structured JSON object for programmatic agent inspection
  content: [
    {
      type: "text",
      text: "Human- and agent-readable summary of the action outcome"
    }
  ]
};
```

On errors, handlers catch exceptions and return structured errors with `{ isError: true, content: [{ type: "text", text: error.message }] }` rather than throwing uncaught exceptions.

### 3. Testing & Verification Requirements

- **Vitest Parity Coverage:** All WebMCP tools must include comprehensive unit and integration tests in `packages/admin-ui/src/lib/webmcp/__tests__/`, verifying strict input schema validation, valid execution paths, and error scenarios.
- **Static Parity Audit:** Before commits, developers and agents run `node .agents/skills/webmcp-parity-audit/scripts/audit-webmcp.mjs` to audit tool inventory, global bridge bindings (`window.webmcp` / `navigator.modelContext`), and editor lifecycle parity.

## Multi-Tier Testing Architecture

We employ a comprehensive multi-tier testing strategy to separate fast, offline unit tests from full end-to-end integration tests.

### 1. Unit & Component Testing (Vitest & Cargo)
- **Rust Unit Tests:** Run `cargo test` to execute unit tests for `zygo-core` models, D1 query builders, and MiniJinja template validation across crates (including `packages/core` and `packages/template-wasm`).
- **Admin UI Testing:** Run `pnpm run test:admin` to run component, hook, and WebMCP tool tests using Vitest and React Testing Library.
- **Template & Schema Validation:** Section templates and layouts use MiniJinja (Jinja2-compatible syntax). Dynamic template syntax and schema validation are tested both in Rust (`zygo-core`, `template-wasm`) and in TypeScript (`packages/admin-ui/src/lib/webmcp/templateTools.ts`).
- **Offline CDN Import Mocking:** Client scripts using browser CDN imports (`https://esm.sh/...`) must be aliased in `vitest.config.js` to lightweight local stubs (`tests/mocks/esm.js`) to keep tests offline and fast.

### 2. Worker Integration (Level 2 - `unstable_dev`)
End-to-end integration tests that boot the compiled Rust Wasm worker in a simulated Cloudflare environment via Wrangler `unstable_dev`. This tests the actual HTTP boundaries, D1 database interactions, and Cloudflare bindings.

```bash
pnpm run test:e2e
```

## D1 SQLite Migration Rules

Cloudflare D1 is backed by SQLite, which has strict limitations on `ALTER TABLE` statements. When creating new migrations in the `migrations/` folder, you must adhere to these rules:

### No Non-Constant Defaults
SQLite strictly disallows non-constant defaults (such as `CURRENT_TIMESTAMP`, `CURRENT_DATE`, or expressions) in `ALTER TABLE ... ADD COLUMN`.

### The Pattern
1. Always add the new column as nullable.
2. Follow it immediately with an `UPDATE` backfill query.

**Code Example:**

```sql
-- INCORRECT: Will fail in SQLite
ALTER TABLE entries ADD COLUMN published_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- CORRECT PATTERN
-- 1. Add the column as nullable
ALTER TABLE entries ADD COLUMN published_at DATETIME;

-- 2. Backfill existing rows
UPDATE entries SET published_at = CURRENT_TIMESTAMP WHERE published_at IS NULL;

-- 3. (Optional) Create an index if frequently queried
CREATE INDEX idx_entries_published_at ON entries(published_at);
```

Another example with a boolean flag:

```sql
-- Add a new active flag to users
ALTER TABLE users ADD COLUMN is_active INTEGER;

-- Backfill existing users to be active by default
UPDATE users SET is_active = 1 WHERE is_active IS NULL;
```

## Site Backup, Export & Import

Zygo CMS provides built-in 1-click site backup and restore capabilities for full data portability:

- **Portable Archive Format**: Downloads a structured JSON bundle (`zygo-backup-YYYY-MM-DD.json`) capturing settings, menus, section templates, layout templates, entries, redirects, and media manifests.
- **Admin Endpoints**:
  - `GET /api/admin/export`: Downloads the versioned JSON archive.
  - `POST /api/admin/import`: Validates schema & MiniJinja templates, supports `dry_run` preview counts, upserts data, preserves page hierarchies via slugs, and purges the edge cache.
- **Admin UI**: Available on the **Settings** page under **Backup & Portability**.
- **MCP Parity**: Fully accessible via both in-browser WebMCP (`export_site_backup`, `import_site_backup`) and CLI MCP (`zygo_export_site_backup`, `zygo_import_site_backup`).

