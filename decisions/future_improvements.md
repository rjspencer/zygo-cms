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
- **Admin Dashboard Auth Gate**: Cloudflare Access verification at the edge with default-hidden content and loading state to prevent unauthorized viewing of draft titles.
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

### Editor Child Page Guard & Management
- **Backend Hierarchy Guards**: Enforced backend SQLite deletion guard preventing deletion of parent pages with active children (`entries WHERE parent_id = ?1`), and type-conversion guard blocking conversion of parent pages into posts when subpages exist.
- **Child Page Querying**: Added `db::find_all_children` in `src/db/entry.rs` to fetch all subpages (draft and published) for parent entries.
- **In-Editor Subpage Navigation**: Added "Subpages in this section" card in `templates/editor.html` showing direct edit links, paths, status badges, and "+ Add Subpage" button prepopulating `?parent_id=...`.
- **Guarded Deletion Button**: Delete button is conditionally disabled with tooltip warning (`⚠️ Deletion blocked: page has N subpage(s)`) when child pages exist, and confirms deletion for childless entries.
- **Frontend Type Guard**: Client-side validation in `public/editor.js` alerting and immediately reverting attempts to change page type to post when subpages exist.

### Revisions, Version History & Preview System
- **Decoupled Draft Workflow (Option A)**: Enables saving draft snapshots without prematurely publishing to public pages or purging edge cache.
- **D1 Revision Tracking**: Created `entry_revisions` table (`0005_create_revisions_table.sql`) snapshotting `title, description, cover_image, body_html, body_json, category, tags, preview_token, created_at` on every create or update.
- **Tokenized Preview Route**: Dedicated `GET /preview/:token` rendering revision snapshots with edge caching strictly bypassed (`Cache-Control: no-store`) and an interactive "Preview Mode" banner linking back to the editor.
- **Version History Drawer & One-Click Rollback**: Modal in `templates/editor.html` and `public/editor.js` fetching revision history via `GET /api/entries/:id/revisions`, allowing instant preview and restoring past content directly into TipTap and form inputs.
- **Cascading Deletion**: Automatic cleanup of all associated revisions when an entry is deleted.

### User Roles & Permissions (RBAC)
- **JIT Provisioning & Multi-Tenant Support**: First user authenticated via Cloudflare Access is granted `admin`, subsequent users become `author`. Local `users` table created (`0007_create_users_table.sql`) mapping external IDs to internal roles.
- **Granular Backend Guards**: Enforced strict ownership over drafts and content via SQLite queries (`WHERE author_id = ?1`), ensuring authors can only edit and manage their own work, while admins have global access.
- **Unified Auth Middleware**: Upgraded `auth_required!` macro to inject the fully-hydrated local `User` struct into the Request context on every protected route.

### Navigation & Menu Builder
- **Dynamic UI**: Implemented an intuitive, vanilla JS Navigation Builder at `/admin/navigation` allowing admins to visually build out infinitely-nesting JSON tree structures for header and footer menus.
- **Safe Recursive Templating**: Enforced strict 4-level deep recursion guards in pure Rust `render_menu_html` to prevent template parsing panics, stack overflows, and maliciously deep layouts.
- **Smart Cloudflare Cache Purging**: When a menu layout is saved, the backend automatically issues an API call to Cloudflare (`cache::purge_urls`), correctly chunking arrays up to 30 URLs per batch, ensuring navigation changes deploy globally instantly without 400 Bad Request API limits.
- **Robust SQL Updates**: Integrated SQLite `UPSERT` commands to elegantly handle updating menus whether they exist in D1 or not without silent failures.

### Testing Architecture
- **Two-Tier Test Suite**:
  - **Level 1 (DOM & Real Templates)**: Vitest + HappyDOM + `@testing-library/dom` loading `templates/editor.html` directly from disk with offline CDN stubs (`tests/mocks/esm.js`).
  - **Level 2 (Worker Integration)**: End-to-end integration tests (`tests/worker.test.js`) booting the compiled Rust Wasm worker via Wrangler `unstable_dev`.
  - **Unit Tests**: `cargo test --lib` covering models, excerpt generation, validation, and metadata logic.
- **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/deploy.yml`) with automated caching, linting, tests, remote D1 migrations, and release deployment.

### Full-Text Site Search
- **Server-Side Search**: Implemented a native server-side search route at `/search` using SQLite FTS5 queries across all published content.

### Analytics Dashboard
- **Admin Analytics View**: Integrated a lightweight, built-in privacy-first traffic insights dashboard in the admin UI without requiring a cookie banner.

### Custom Content Types & Schema Builder
- **Schema Builder**: Interface at `/admin/content-types` to define custom entities (e.g., `Product`, `Event`) and construct dynamic JSON schemas with field types (text, number, boolean, date).
- **Editor Integration**: Dynamically renders custom form inputs in the editor sidebar based on the selected content type.
- **JSON Storage**: Safely persists structured data into the `custom_fields_json` D1 column.

### Scheduled Publishing
- **Scheduled Cron Trigger**: Integrated a background cron event (`#[event(scheduled)]`) that automatically transitions posts to "published" status when their `published_at` time arrives, and purges the edge cache.

### Two-Worker Architecture
- **Separated Responsibilities**: Split Zygo CMS into two independent Cloudflare Workers (`public-worker` and `admin-api-worker`) and a shared `core` package.
- **Public Worker (Reader)**: Ultra-lean, minimal dependencies, read-only D1 queries, and aggressive edge caching.
- **Admin Worker (Writer)**: Handles authentication, media uploads, and heavy authoring libraries.

---

## 2. Prioritized Roadmap & Future Work

### Priority


### Soon

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
  - **Webhook Triggers**: Dispatch webhooks (from Roadmap #6) to trigger external frontend builds (Cloudflare Pages, Vercel, Netlify) on publish/update events.

### Webhooks & API Integrations
- **Goal**: Notify external systems of CMS events.
- **Details**:
  - Dispatch HTTP callbacks on key events (e.g., `entry.published`, `entry.updated`) to trigger external builds, social media posts, or notifications.

#### Custom Workflow Statuses
- **Goal**: Extend editorial workflows beyond basic draft/published states.
- **Details**:
  - Add custom states such as "In Review", "Ready for Publish", or "Archived".
  - Integrate with RBAC to restrict who can transition between states.

#### Bulk Content Operations
- **Goal**: Enable efficient management of large content libraries.
- **Details**:
  - Add bulk-select capabilities to lists (posts, pages).
  - Support bulk publish/unpublish, bulk tagging, and move to trash.

---

## 3\. Icebox & Long-Term Considerations

### Content Localization & Multi-language (i18n)
- **Goal**: Treat locales as first-class citizens.
- **Details**:
  - Allow authors to manage translated versions of the same post/page.
  - Serve content via subdirectories (e.g., `/en/post-slug` vs `/fr/post-slug`).

### Multiplayer / Real-time Editing
- **Goal**: Enable Google Docs-style real-time collaborative editing.
- **Details**:
  - Leverage TipTap's native Yjs support.
  - Sync cursor positions and edits via WebSockets (Cloudflare Durable Objects).

### Hosted Section Template Store
- **Goal**: Let users browse and install section templates from a store we host.
- **Details**:
  - Built-in section templates are fully deletable; if a user deletes one and wants it back, they can re-install it from the store.
  - Also a distribution channel for new community/official section templates.

### Post & Page Layout CSS Customization
- **Goal**: Allow users to customize the CSS of the locked post and page layouts.
- **Details**:
  - Post/page layouts live in Rust (`DEFAULT_POST` / `DEFAULT_PAGE`) and are not editable in the admin; only CSS overrides would be exposed.

### Visual Field Builder: Nested List Sub-field Validation
- **Goal**: Strictly validate `list` sub-fields used inside template loops (e.g. `item.caption`).
- **Details**:
  - Currently warn-only, since MiniJinja's `undeclared_variables` cannot map loop variables back to a list's sub-fields.

### Permanent Deletion & Empty Trash UI
- **Goal**: Provide an explicit UI/API mechanism in the admin panel to empty trash or permanently delete soft-deleted entries.
- **Details**:
  - Add "Delete Permanently" action in the Trash table and an "Empty Trash" batch action.
  - Cascade delete associated snapshots in `entry_revisions`.
  - Intentionally kept in the Icebox to maximize data safety; permanent deletion currently requires direct SQL execution via Wrangler D1.

### Connect an Email Sender
- **Goal**: Automatically dispatch onboarding invitation and authentication emails to new users directly from Zygo CMS.
- **Details**:
  - Integrate an email delivery provider (e.g., Cloudflare Email Routing / Workers Email, Resend, or Mailchannels).
  - Automatically deliver the onboarding email with access instructions when an admin invites a user, eliminating the manual copy-paste workflow.

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
  - Integrate a lightweight analytics view in the admin dashboard (e.g., tracking views, referrers).
