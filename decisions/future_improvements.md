# Zygo CMS Architecture, Improvements & Roadmap

A persistent record of architectural decisions, completed enhancements, and prioritized future work for Zygo CMS.

---

## 1. Recently Completed Improvements

### Edge Caching & Purging
- **Multi-Tier Caching**: Dynamic `EDGE_TTL_SECONDS` environment variable (defaulting to 24h / 86400s) with `Cache-Control` response headers.
- **Worker Cache API**: Programmatic `Cache::default()` integration for edge and local worker caching on all public GET routes (`/`, `/:slug`, `/post/:slug`, `/sitemap.xml`, `/rss.xml`).
- **Active Cache Purging**: Automated cache invalidation on `POST /entries`, `PUT /entries/:id`, and `DELETE /entries/:id` that purges the homepage, affected post/page, sitemap, and RSS feed.

### SEO, Normalization & Metadata
- **Canonical URLs**: `utils::get_canonical_origin` auto-strips `www.` and normalizes domains against `CANONICAL_ORIGIN` / `SITE_URL`.
- **Trailing Slash Rules**: Homepage canonical strictly includes trailing slash (`{origin}/`); post and page canonicals strictly omit trailing slashes (`{origin}/post/:slug`).
- **Schema.org JSON-LD**: Auto-generated structured data for `BlogPosting` and `WebPage` with interactive validation, formatting, and template populator in the editor.
- **Auto Meta Descriptions**: HTML block-tag-aware excerpt generation up to 160 characters.
- **Syntax Highlighting & Code Snippets**: TipTap `</> Code Block` toolbar integration with native `<pre><code>` block generation and Highlight.js styling across editor and public post/page templates.
- **Post Taxonomy (Tags & Categories)**: D1 taxonomy migration (`0002_add_taxonomy.sql`), category and tag input controls in the editor, clickable badges on post cards and post view, and public filtered routes `/category/:category` and `/tag/:tag` with automatic cache purging.

### Reliability, Security & Edge Performance
- **Server-Side HTML Sanitization**: Integrated the `ammonia` crate (backed by Mozilla's HTML5 parser `html5ever`) with custom tag and attribute whitelisting for TipTap content, stripping scripts, iframes, inline event handlers, and pseudo-protocols before persisting to D1.
- **D1 List Query Optimization**: Separated queries into `LIST_COLUMNS` and `ALL_COLUMNS` in `src/db/entry.rs`, omitting heavy `body_html` and `body_json` from dashboard, sitemap, and RSS listings to keep memory well under Cloudflare Worker limits.
- **Admin Dashboard Auth Gate**: Client-side PropelAuth verification in `templates/admin_dashboard.html` with default-hidden content and loading state to prevent unauthorized viewing of draft titles.
- **Editor Unsaved Changes Guard**: Dirty state tracking and `beforeunload` event listener in `public/editor.js` to protect authors against accidental data loss.
- **Askama Template Rendering Hygiene**: Clean `render_tmpl` helper eliminating repetitive error mapping closures.

### Template Reusability & Sub-Templates
- **Extracted Layout Partials**: Modularized `templates/includes/header.html`, `footer.html`, and `navigation.html` from `base.html`.
- **Reusable Post List & Pagination**: Extracted `templates/includes/post_list.html` and `templates/includes/pagination.html` from `templates/index.html`.

### Post List Pagination
- **Server-Side Pagination**: Added `?page=N` query parameter handling across homepage (`/`), tag archives (`/tag/:tag`), and category archives (`/category/:category`).
- **D1 Limit/Offset Queries**: Implemented `LIMIT ? OFFSET ?` with `LIST_COLUMNS` in `src/db/entry.rs`, backed by count queries to accurately determine total page count.
- **Canonical & SEO Hygiene**: Strictly preserves canonical rules (homepage trailing slash `{origin}/?page=N`, clean page 1 root without query string, page title indicators `(Page N)`).
- **Configurable Page Size**: Defaults to 10 posts per page, overridable via `POSTS_PER_PAGE` environment variable.

### D1 Media Index, Gallery Modal & Sync
- **D1 Media Indexing**: Created `media` table tracking `id, key, filename, mime_type, size_bytes, created_at` with indexes on `filename` and `created_at`.
- **Atomic Upload Rollback**: Image uploads store in R2 and immediately index into D1; if D1 indexing fails, R2 storage automatically rolls back to prevent drift.
- **R2-to-D1 Reconciliation Engine**: Cursor-paginated bucket scanner (`media::sync_r2_to_d1`) diffing R2 objects against D1 keys and backfilling missing entries with inferred filenames and mime types.
- **Runtime & Cost Safety Guards**: Hard 25-second wall-clock timeout ceiling, max 10-page / 10,000-item batch cap, and cursor loop detection to prevent execution overages or runaway loops.
- **Automated Weekly Background Cron**: Configured `[triggers] crons = ["0 0 * * 0"]` in `wrangler.toml` hooked to native `#[event(scheduled)]` in `src/lib.rs` for automated zero-overhead maintenance.
- **Admin On-Demand Sync & Upgraded Modal**: Admin route `POST /api/media/sync`, "Sync Bucket" button, real-time debounced filename search, 6-way sorting, and paginated gallery controls in the editor.

### Testing Architecture
- **Two-Tier Test Suite**:
  - **Level 1 (DOM & Real Templates)**: Vitest + HappyDOM + `@testing-library/dom` loading `templates/editor.html` directly from disk with offline CDN stubs (`tests/mocks/esm.js`).
  - **Level 2 (Worker Integration)**: End-to-end integration tests (`tests/worker.test.js`) booting the compiled Rust Wasm worker via Wrangler `unstable_dev`.
  - **Unit Tests**: `cargo test --lib` covering models, excerpt generation, validation, and metadata logic.
- **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/deploy.yml`) with automated caching, linting, tests, remote D1 migrations, and release deployment.

---

## 2. Prioritized Roadmap & Future Work

### 1. Editor Child Page Guard & Management
- **Goal**: Prevent accidental deletion of parent pages with active subpages and provide quick access to edit child pages.
- **Details**:
  - In the Editor, retrieve the list of child pages for the current page entry.
  - Disable the "Delete" option if child pages exist, displaying a helpful tooltip explaining why deletion is blocked.
  - Render an "In this section / Child pages" panel in the editor displaying the list of child pages with direct links to edit them.

### 2. Scheduled Publishing
- **Goal**: Allow users to set a future publication date for posts.
- **Details**: 
  - Add UI in the editor to select a future date and time for `published_at`.
  - Implement a cron trigger or deferred worker task to automatically transition status and purge caches when the time arrives.

### 3. Revisions, Version History & Preview System
- **Goal**: Provide complete editorial version control, rollback capabilities, and secure tokenized previews for both drafts and historical revisions without prematurely publishing to the live site.
- **Details**:
  - Create a D1 `entry_revisions` table tracking `id, entry_id, title, description, body_html, body_json, category, tags, preview_token, created_at`.
  - Automatically snapshot content to `entry_revisions` on every editor save, enabling drafting updates on already-published posts without altering live public content.
  - Implement a dedicated preview route `GET /preview/:token` that renders revision snapshots in the public layout with edge caching bypassed (`Cache-Control: no-store`) and an interactive "Preview Mode" top bar.
  - Build a "Version History" drawer/modal in `public/editor.js` allowing authors to browse past revisions, preview any historical state, and restore previous content with one click.

### 5. User Roles & Permissions (RBAC)
- **Goal**: Support multiple users with distinct permission levels.
- **Details**:
  - Move beyond the global Auth Gate to role-based access control (e.g., Admin, Editor, Author, Contributor).
  - Map roles to specific database operations (e.g., Authors can only edit their own posts).

### 6. Custom Content Types & Schema Builder
- **Goal**: Enable custom content modeling via the admin UI.
- **Details**:
  - Provide an interface to define custom entities (e.g., `Product`, `Event`) and custom fields dynamically, shifting away from hardcoded schemas in Rust.

### 7. Full-Text Site Search
- **Goal**: Allow users to search across all published content.
- **Details**:
  - Implement a server-side search using SQLite FTS5 or integrate a client-side search solution (e.g., Algolia or Orama).

### 8. Navigation & Menu Builder
- **Goal**: Manage site menus dynamically from the admin panel.
- **Details**:
  - Replace hardcoded template links with a dynamic JSON-backed or D1-backed menu structure.
  - Build a drag-and-drop UI to construct header and footer menus.

### 9. Webhooks & API Integrations
- **Goal**: Notify external systems of CMS events.
- **Details**:
  - Dispatch HTTP callbacks on key events (e.g., `entry.published`, `entry.updated`) to trigger external builds, social media posts, or notifications.

### 10. Analytics Dashboard & Localization
- **Goal**: Built-in insights and multi-language support.
- **Details**:
  - Integrate a lightweight analytics view in the admin dashboard (e.g., tracking views, referrers).
  - Introduce i18n support for pages and posts.

---

## 3. Icebox & Long-Term Considerations

### Split Public & Admin Workers
- **Concept**: Separate Zygo CMS into two independent Cloudflare Workers:
  1. **Public Worker (Reader)**: Ultra-lean, minimal dependencies, read-only D1 queries, and aggressive edge caching.
  2. **Admin Worker (Writer)**: Handles authentication, PropelAuth validation, media uploads, and heavy authoring libraries (e.g. Ammonia sanitization).
- **Triggers**: Revisit only if future writer-side features push the compiled Wasm binary or CPU usage toward Cloudflare Worker limits. Currently, the unified worker remains well under 1 MB and well within performance boundaries.

### Headless CMS Content API
- **Concept**: Enable Zygo CMS to function as a decoupled, headless CMS powering external static site generators, mobile apps, or modern JAMstack frontends (Astro, Next.js, SvelteKit).
- **Feasibility & Effort**: **Low to Moderate**. Zygo is already ~70% of the way there:
  - Database entries already store both rendered `body_html` and structured TipTap JSON (`body_json`).
  - Rust models already derive `serde::Serialize` and `serde_json` is integrated.
  - Paginated D1 queries and filtering logic (category, tag, status) already exist.
  - Edge caching infrastructure works seamlessly with JSON responses.
- **Key Requirements**:
  - **Public Content Delivery API**:
    - `GET /api/v1/posts` & `GET /api/v1/pages`: Paginated listing with `?page=`, `?per_page=`, `?tag=`, and `?category=`.
    - `GET /api/v1/posts/:slug` & `GET /api/v1/pages/*`: Single entry retrieval with full metadata, breadcrumbs, `body_html`, and `body_json`.
    - `GET /api/v1/taxonomies`: List tags and categories with entry counts.
  - **CORS Support**: Provide configurable CORS headers (`Access-Control-Allow-Origin`, `OPTIONS` preflight) on `/api/*` routes for decoupled frontends.
  - **API Token Auth (Optional)**: Optional read-only API key support (`Authorization: Bearer <token>` or `X-Api-Key`) for private/draft preview consumption.
  - **Webhook Triggers**: Dispatch webhooks (from Roadmap #10) to trigger external frontend builds (Cloudflare Pages, Vercel, Netlify) on publish/update events.

---

## 4. Developer & Testing Cheat Sheet

```bash
# Run Rust unit tests
cargo test --lib

# Run Level 1 DOM / Template tests (Vitest + HappyDOM)
npm test

# Run Level 2 Worker Integration tests (Wrangler dev server)
npm run test:e2e

# Run all test suites
npm run test:all

# Check compilation for Wasm target
cargo check --target wasm32-unknown-unknown

# Run local worker development server
npx wrangler dev
```
