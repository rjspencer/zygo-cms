# Zygo CMS Roadmap & Prioritized Backlog

This document tracks upcoming priorities, planned enhancements, and long-term architectural items for Zygo CMS.

---

## 1. Immediate Priority

### Setup Experience & Onboarding Remediation
- **Goal**: Resolve critical setup script bugs, security vulnerabilities (fail-open Access AUD), cross-platform Windows/Linux blocks, and documentation discrepancies identified during the new-user setup review.
- **Audit**: [`docs/audits/setup-review/SUMMARY.md`](docs/audits/setup-review/SUMMARY.md) (Full reports: [`1-docs.md`](docs/audits/setup-review/1-docs.md), [`2-script-ux.md`](docs/audits/setup-review/2-script-ux.md), [`3-script-accuracy.md`](docs/audits/setup-review/3-script-accuracy.md), [`4-opportunities.md`](docs/audits/setup-review/4-opportunities.md), [`5-content.md`](docs/audits/setup-review/5-content.md))
- **Key Tasks**:
  - **Documentation & Educational Content (P1)**:
    - [ ] **Canonical Quickstart & README Overhaul**: Eliminate fictional password signup, document `:5173` dev auth bypass (`ENVIRONMENT=dev`), standardize on `pnpm run db:migrate:local`, fix `pnpm setup` collision, reconcile architecture to Three Workers + Minijinja + React 19 ([`1-docs.md` Issues 1, 2, 9, 10, 12](docs/audits/setup-review/1-docs.md)).
    - [ ] **Data Model & Recipes Alignment**: Update `docs/official/concepts.md` with true D1 schema tables (replace fabricated Taxonomy diagrams); update `docs/official/examples.md` to document UI theme/template customization and Service Token API auth ([`1-docs.md` Issues 27, 28, 29, 30, 31, 33](docs/audits/setup-review/1-docs.md)).
    - [ ] **Cross-Platform OS Guide & Troubleshooting FAQ**: Publish Guide 4 (Troubleshooting FAQ) and Guide 5 (CLI Cheat-Sheet); add explicit WSL2 recommendation and setup commands for Windows 11 ([`5-content.md` Guides 4 & 5](docs/audits/setup-review/5-content.md)).
    - [ ] **Core Onboarding Video Production**: Produce Video 1 ("Zero to Live Site in 5 Minutes") and Video 2 ("Cloudflare Access & Zero Trust Setup") per scripts in `docs/audits/setup-review/5-content.md`.

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
  - **Webhook Triggers**: Dispatch webhooks to trigger external frontend builds (Cloudflare Pages, Vercel, Netlify) on publish/update events.

---

## 2. Soon

### Instagram Feed Section with Automated Cron Sync
- **Goal**: Provide a zero-cookie, GDPR-compliant Instagram Profile & Grid section template (`instagram-feed`) that automatically syncs latest posts, thumbnails, and profile stats via a background Cloudflare Worker cron trigger.
- **Details**:
  - Seed an `instagram-feed` section template featuring an account profile header (avatar with gradient ring, handle, followers and post counts) and a responsive 3×2 thumbnail grid with media-type indicators (play icon for videos, carousel badge) and outbound post links.
  - Implement a scheduled background Worker cron (`[triggers.crons]`) to periodically fetch recent media from Instagram's API, mirror thumbnails to R2/CDN storage, and persist updated section data in D1.
  - Completely eliminates third-party client scripts, tracking cookies, and layout shifts (CLS), guaranteeing 100% GDPR compliance without requiring a cookie consent banner.

### Pre-Built Wasm Distribution & CI-Managed `release` Branch
- **Goal**: Enable non-developers to scaffold, run, and deploy Zygo CMS without installing Rust (`rustup`, `cargo`, `worker-build`, `wasm-pack`) locally, while keeping daily CI build minutes low.
- **Spec**: [`docs/specs/prebuilt_wasm_release_spec.md`](docs/specs/prebuilt_wasm_release_spec.md)
- **Details**:
  - Maintain `main` as the single human-authored branch (with `build/` and `pkg/` ignored).
  - Add a tag/dispatch-triggered GitHub Action (`.github/workflows/release.yml`) that compiles `public-worker/build`, `admin-api-worker/build`, and `template-wasm/pkg` in `--release` mode and force-pushes the verified snapshot to a CI-owned `release` branch.
  - Point `create-zygo-app` to clone `release` by default and preserve pre-built Wasm bundles so end users only need Node.js (`npx` / `pnpm`).

### Setup Wizard DNS Pre-Flight Conflict Check
- **Goal**: Prevent `wrangler deploy` failures caused by pre-existing `A`, `AAAA`, or `CNAME` DNS records on target Custom Domains during initial setup.
- **Spec**: [`docs/specs/setup_dns_conflict_check_spec.md`](docs/specs/setup_dns_conflict_check_spec.md)
- **Details**:
  - Query `/zones/:zoneId/dns_records` in `scripts/setup.mjs` for the configured Zygo hostnames (respecting `apexHandling`).
  - Detect conflicting `A`, `AAAA`, and `CNAME` records while strictly ignoring `MX`, `TXT`, and existing Worker Custom Domain records.
  - Display any conflicts to the user and prompt for confirmation to delete them via the Cloudflare API before deploying.

### Backend CLI MCP Server (`zygo-mcp`) Parity & Upgrade
- **Goal**: Bring the standalone CLI MCP bridge (`packages/zygo-mcp`) into full parity with the current `/api/*` REST endpoints, page sections data model, and in-browser WebMCP tools.
- **Spec**: [`docs/specs/zygo_mcp_parity_spec.md`](docs/specs/zygo_mcp_parity_spec.md)
- **Details**:
  - Fix legacy unprefixed `/posts` and `/entries` endpoints to use `/api/*`.
  - Support the current `body_json` Page Sections array format alongside `body_html` for posts/docs.
  - Add CLI MCP tools for pages/sections, section & layout templates, navigation menus, media, settings, and bulk entry actions.

### 1-Click Site Backup, Export & Import
- **Goal**: Give site owners full data portability and 1-click backup/restore capabilities directly from the Admin UI Settings page.
- **Spec**: [`docs/specs/site_backup_export_import_spec.md`](docs/specs/site_backup_export_import_spec.md)
- **Details**:
  - Add `GET /api/admin/export` and `POST /api/admin/import` (with `dry_run` preview) to export and restore settings, menus, section & layout templates, entries, redirects, and media manifests as a versioned JSON bundle.
  - Add a **Backup & Portability** card in `Settings.tsx` alongside WebMCP and `zygo-mcp` tools.

### Documentation Sync & Architecture Alignment
- **Goal**: Synchronize `README.md`, `AGENTS.md`, and `docs/official/` with the current Zygo CMS architecture.
- **Details**:
  - Update outdated references to compile-time Askama templates in `README.md`, `AGENTS.md`, and `docs/official/advanced.md` to reflect dynamic database-backed **MiniJinja** templates and client-side Wasm previewing (`template-wasm`).
  - Clarify the `body_json` (Page Sections JSON array) vs. `body_html` (Post/Doc rich text) data model in `README.md` and `docs/official/concepts.md`.
  - Fix the local Admin UI port (`:3000` / `:5173`) and Cloudflare Access local dev auth instructions in `docs/official/quickstart.md`.

### Webhooks & API Integrations
- **Goal**: Notify external systems of CMS events.
- **Details**:
  - Dispatch HTTP callbacks on key events (e.g., `entry.published`, `entry.updated`) to trigger external builds, social media posts, or notifications.

### Custom Workflow Statuses
- **Goal**: Extend editorial workflows beyond basic draft/published states.
- **Details**:
  - Add custom states such as "In Review", "Ready for Publish", or "Archived".
  - Integrate with RBAC to restrict who can transition between states.


---

## 3. Icebox & Long-Term Considerations

### Cloudflare Images (Paid Add-On) Integration
- **Goal**: Optional integration with Cloudflare's paid Image Transformations / Cloudflare Images service for on-the-fly edge resizing, AVIF/WebP negotiation, and custom crop focal points.
- **Details**:
  - Allow users on paid Cloudflare plans to toggle native `/cdn-cgi/image/...` URL rewriting as an alternative or supplement to Zygo's built-in client-side upload resizer.

### Public AI Discovery (`/llms.txt`)
- **Goal**: Serve an auto-generated `/llms.txt` route on `public-worker` summarizing published pages, posts, and docs for external AI search engines and LLM crawlers.
- **Details**:
  - Dynamically generate a clean Markdown index of published entries and site metadata (cached and invalidated alongside `/sitemap.xml`).

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

### Shareable Links Enhancements
- **Goal**: Expand the Shareable Trackable Links feature in the Admin UI.
- **Details**:
  - Add a logo overlay to the QR code generation.
  - Implement pagination for the trackable links list.
  - Add filtering, sorting, and querying capabilities to the list.
  - Add a description field to the trackable link.
  - Display the creator of the trackable link.
  - Allow editing of the title and description, while keeping the URL locked and uneditable.
