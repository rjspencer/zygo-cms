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
- **D1 List Query Optimization**: Separated queries into `LIST_COLUMNS` and `ALL_COLUMNS` in `src/db/entry.rs`, omitting heavy `body_html` and `body_json` from dashboard, sitemap, and RSS listings to keep memory well under Cloudflare Worker limits.
- **Admin Dashboard Auth Gate**: Client-side PropelAuth verification in `templates/admin_dashboard.html` with default-hidden content and loading state to prevent unauthorized viewing of draft titles.
- **Editor Unsaved Changes Guard**: Dirty state tracking and `beforeunload` event listener in `public/editor.js` to protect authors against accidental data loss.
- **Askama Template Rendering Hygiene**: Clean `render_tmpl` helper eliminating repetitive error mapping closures.

### Testing Architecture
- **Two-Tier Test Suite**:
  - **Level 1 (DOM & Real Templates)**: Vitest + HappyDOM + `@testing-library/dom` loading `templates/editor.html` directly from disk with offline CDN stubs (`tests/mocks/esm.js`).
  - **Level 2 (Worker Integration)**: End-to-end integration tests (`tests/worker.test.js`) booting the compiled Rust Wasm worker via Wrangler `unstable_dev`.
  - **Unit Tests**: `cargo test --lib` covering models, excerpt generation, validation, and metadata logic.
- **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/deploy.yml`) with automated caching, linting, tests, remote D1 migrations, and release deployment.

---

## 2. Prioritized Roadmap & Future Work

### 1. Homepage Pagination
- **Goal**: Prevent the homepage from displaying an unbounded list of posts.
- **Details**:
  - Add `?page=N` query parameter handling to `GET /`.
  - Render "Previous" and "Next" pagination controls in `templates/index.html`.
  - Use `LIMIT ? OFFSET ?` queries with `LIST_COLUMNS` in `src/db/entry.rs`.

### 2. D1 Media Index & Gallery Modal (Phase 3)
- **Goal**: Full asset management and search for uploaded images.
- **Details**:
  - Create a `media` table in D1 tracking `id, key, filename, mime_type, size_bytes, created_at`.
  - Update `src/media.rs` to insert metadata on upload and delete records on removal.
  - Add filename search and sorting in the media picker modal in `public/editor.js`.

### 3. Server-Side HTML Sanitization
- **Goal**: Mitigate Stored XSS risks from rich-text content.
- **Details**:
  - Sanitize `body_html` on the server before saving to D1 using a lightweight sanitizer or tag whitelist (stripping `<script>`, `<iframe>`, inline event handlers).

---

## 3. Developer & Testing Cheat Sheet

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
