# Changelog

A persistent record of completed improvements, architectural enhancements, and notable milestones for Zygo CMS.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## Completed Improvements & Milestones

### Setup Experience: Preflight Doctor, Non-Interactive Automation & Rollback (`scripts/setup.mjs`)
- **Preflight Diagnostic Engine & `--doctor` CLI Flag (`scripts/setup.mjs`)**:
  - Implemented `runPreflightChecks()` and `printPreflightReport()` to validate Node.js LTS (>= 22), pnpm (>= 11), Rust `wasm32-unknown-unknown` target, `worker-build`, Cloudflare Account ID detection, and Cloudflare Zone presence before modifying files.
  - Added standalone `node scripts/setup.mjs --doctor` command that runs diagnostics, outputs a formatted terminal report with remediation commands, and exits with code 0 (or 1 on critical missing tools).
- **Non-Interactive Automation & CLI Flags (`scripts/setup.mjs`)**:
  - Implemented `parseCliArgs()` using `node:util.parseArgs` supporting `--doctor`, `--yes` (`-y`), `--dry-run`, `--no-deploy`, `--domain`, `--email`, `--account-id`, `--token`, `--public-subdomain`, `--admin-ui-subdomain`, `--admin-api-subdomain`, `--apex-handling`, `--team-name`, `--bot-fight-mode`, `--security-level`, and `--skip-access`.
  - Added non-interactive flag validation: requires `--domain` and `--email` when `--yes` is specified, exiting cleanly with helpful error messages.
  - Implemented `--dry-run` displaying a comprehensive 10-step execution plan without mutating files or provisioning remote resources.
  - Added `--no-deploy` option to provision and configure resources without triggering build and deploy.
- **Progressive Disclosure Wizard (`scripts/setup.mjs`)**:
  - Replaced 6 granular Edge and WAF prompts with production defaults (Bot Fight on, AI blocked, Medium WAF, HTTP/3, Tiered Cache, IPv6, Brotli, Early Hints) and a single opt-in prompt for advanced customization.
- **In-Memory Configuration Snapshots & Atomic Rollback (`scripts/setup.mjs`)**:
  - Implemented `backupConfigs()` and `rollbackConfigs()` snapshotting `wrangler.toml` files and `.env.production` in memory prior to provisioning.
  - Automatically restores pre-run configuration files and deletes newly created `.env.production` if an unhandled error occurs during provisioning.
- **Post-Deployment Edge Verification & Health Check (`scripts/setup.mjs`)**:
  - Implemented `verifyDeployment()` issuing manual-redirect `HEAD` requests to the Public Site (200/301/302), Admin UI (200/302), and Admin API `/api/me` (200/302/401) with status reporting.
- **Dead Code Cleanup & Exports (`scripts/setup.mjs`)**:
  - Removed obsolete readline functions `promptInput` and `promptYesNo`.
  - Exported all new helper functions for unit testability.
- **Comprehensive Vitest Suite (`tests/setup-script.test.js`)**:
  - Added 19 unit test cases covering argument parsing, toolchain preflight checks, doctor report printing, backup/rollback filesystem operations, and deployment health check responses (total 91 tests passing).

### Setup Experience & Security Hardening (P0 Remediation)
- **Zero Trust Fail-Closed Authentication (`packages/admin-api-worker/src/auth.rs`)**:
  - Enforced strict fail-closed authentication: requests in non-dev and non-test environments immediately fail with `HTTP 401 Unauthorized` if either `CF_ACCESS_AUD` or `CF_ACCESS_TEAM_DOMAIN` is empty or unconfigured.
  - Implemented deterministic `check_access_config_validity()` eliminating runtime `std::env::var` dependencies in WebAssembly Cloudflare Worker isolates.
- **D1 Migration Target & Root Configuration Sanitization (`wrangler.toml`, `package.json`, `scripts/setup.mjs`)**:
  - Purged maintainer's hardcoded D1 UUID (`488417e7-...`) and author domains from root `wrangler.toml`, setting `database_id = ""` with guidance comments.
  - Updated `scripts/setup.mjs` `applyRemoteMigrations()` and `package.json` `db:migrate` / `db:migrate:local` to explicitly pass `-c packages/admin-api-worker/wrangler.toml`.
- **Windows 11 Path Handling & Cross-Platform Utilities (`scripts/setup.mjs`, `scripts/wait.mjs`, `package.json`)**:
  - Switched `scripts/setup.mjs` path math to `fileURLToPath(import.meta.url)`, fixing Windows drive letter path resolution bugs (`/C:/`).
  - Added cross-platform wait utility `scripts/wait.mjs` and replaced POSIX `sleep 3 &&` in `package.json` (`dev:public`).
- **Terminal Ergonomics, Secret Masking & Credential Propagation (`scripts/setup.mjs`)**:
  - Masked Cloudflare API tokens and Google client secrets using `@clack/prompts` `password()`.
  - Injected `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` into all Wrangler subprocess calls (`childEnv`).
  - Propagated non-zero exit codes on build/deploy failures to prevent false-positive completion reports.
- **Cache Purge & Subdomain Wiring (`scripts/setup.mjs`, `packages/admin-api-worker/src/lib.rs`)**:
  - Updated `updateAdminApiZoneVar()` to write `CF_ZONE_ID` to both `admin-api-worker/wrangler.toml` and `public-worker/wrangler.toml`.
  - Updated `updatePublicWrangler()` to support and persist custom `ADMIN_SUBDOMAIN`.
  - Generalized CORS origin checking in `packages/admin-api-worker/src/lib.rs` to support custom API/Admin subdomains with strict dot-boundary validation preventing suffix spoofing.
  - Handled Cloudflare redirect ruleset API errors gracefully with user-facing token scope guidance.

### Tiptap Editor Medium Image Sizing & Responsive Width Attributes
- **Medium Image Resolution & Responsive Attributes (`packages/admin-ui/src/components/RichTextEditor/`)**:
  - Implemented `toMediumImageUrl` in `useRichTextEditor.ts` to automatically route Media Picker image selections to the medium tier (`?size=md` or `&size=md`).
  - Extended `ZygoImage` schema with `width` and `style` attributes in `addAttributes()` ensuring ProseMirror parses, preserves, and serializes these attributes in `getHTML()`.
  - Updated node view to set and update `width="1024"` and `style="max-width: 100%"` on the DOM `<img>` element.
  - Added Storybook story `WithMediumImage` in `RichTextEditor.stories.tsx`.
  - Added unit test suites verifying medium URL resolution, HTML attribute serialization, and editor DOM sync in `RichTextEditor.test.tsx` and `Editor.test.tsx`.

### Fix Tiptap Media Preview URLs & Worker Media MIME Types
- **Tiptap Image Preview Origin Resolution (`packages/admin-ui/src/components/RichTextEditor/hooks/useRichTextEditor.ts`)**:
  - Implemented `ZygoImage` node view extending `@tiptap/extension-image` to resolve relative `/media/...` URLs to the public site origin (`getPublicSiteUrl`) in the editor DOM while keeping `node.attrs` and `renderHTML` relative (`/media/...`) for portable database storage.
  - Resolved image URLs in `CoverImageField`, `IMessagePreview`, and `SlackPreview` using `getPublicSiteUrl`.
  - Updated `getPublicSiteUrl` (`packages/admin-ui/src/utils/api.ts`) to preserve absolute URLs (`http://`, `https://`, `data:`).
- **Public & Admin API Worker Media Content-Type Fallbacks (`packages/public-worker/src/media.rs`, `packages/admin-api-worker/src/media.rs`)**:
  - Added fallback to `guess_mime_type(key)` on `get_media` when R2 metadata is missing or generic `application/octet-stream`, ensuring SVGs always return `Content-Type: image/svg+xml`.
- **Public Site Prose Image Styling (`packages/public-worker/src/style.css`, `public/style.css`)**:
  - Added `.text-image-prose img` responsive rules (`max-width: 100%`, `height: auto`, `margin: 1.5rem 0`, `border-radius: var(--border-radius, 6px)`).

### Native Contact & Newsletter Forms, Rate Limiting & D1 Submissions Inbox
- **Zero-Write Pre-D1 Gating Pipeline (`packages/public-worker/src/handlers/public.rs`, `packages/public-worker/src/lib.rs`)**:
  - Implemented `POST /forms/submit` handling `application/json` and `application/x-www-form-urlencoded` payloads.
  - Enforced a strict 64 KB `Content-Length` cap (returning HTTP 413 Payload Too Large for oversized bodies).
  - Built Cloudflare Cache API rate limiting (`caches.default`) with a 600-second TTL and bounded memory fallback (max 5 submissions per 10 minutes per IP), rejecting abusive traffic with HTTP 429 Too Many Requests before invoking D1.
  - Decoy honeypot bot defense (`website` / `_gotcha`) that silently returns HTTP 200 without executing database writes.
  - Fail-closed Cloudflare Turnstile token verification (`cf-turnstile-response`) with a strict 5-second async race timeout.
- **D1 Schema & Preset Section Templates (`migrations/0013_form_submissions.sql`, `packages/core/src/models/form_submission.rs`, `packages/core/src/db/form_submission.rs`)**:
  - Created `form_submissions` table with indexes on `status`, `created_at`, and `form_name`.
  - Seeded built-in, theme-adaptive `contact-form` (Contact Form) and `newsletter` (Newsletter Signup) preset section templates with honeypot fields and accessible markup.
  - Added `FormSubmission`, `CreateFormSubmission`, `UpdateFormSubmissionStatus`, and `SubmissionStats` models with strict validation boundaries and explicit-column queries (no `SELECT *`).
- **Admin REST API & RBAC Security (`packages/admin-api-worker/src/handlers/submissions.rs`, `packages/admin-api-worker/src/handlers/api.rs`)**:
  - Implemented `GET /api/submissions`, `GET /api/submissions/stats`, `GET /api/submissions/:id`, `PUT /api/submissions/:id`, and `DELETE /api/submissions/:id`.
  - Enforced strict RBAC (`user.role == "admin"`, returning HTTP 403 Forbidden for non-admins).
  - Masked `turnstile_secret_key` with `"••••••••"` in settings endpoints to prevent secret key leakage.
- **Admin UI Submissions Inbox (`packages/admin-ui/src/pages/Submissions/`, `packages/admin-ui/src/App.tsx`, `packages/admin-ui/src/components/Layout/`)**:
  - Built modular Submissions Inbox page with search, status tabs (all, unread, read, archived), pagination, read/unread toggles, delete action, and detail modal.
  - Defended against CSV Formula Injection (DDE) in `csvExport.ts` by prefixing dangerous formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with `'`.
  - Used safe React JSX text rendering with CSS `whiteSpace: 'pre-wrap'` (zero `dangerouslySetInnerHTML`) and sanitized `mailto:` links with `encodeURIComponent`.
  - Added a dynamic unread count badge on the "Submissions" sidebar navigation link.
- **WebMCP & CLI MCP Parity (`packages/admin-ui/src/lib/webmcp/submissionTools.ts`, `packages/zygo-mcp/index.mjs`)**:
  - Added 4 parity tools across both in-browser WebMCP and CLI MCP (`zygo-mcp`): `list_form_submissions`, `get_form_submission`, `update_form_submission_status`, and `delete_form_submission`.
  - Added Vitest and Storybook integration tests validating full end-to-end functionality.

### Cloudflare Zero Trust Organization Provisioning & Team Domain Detection
- **Automated Zero Trust Org Setup (`scripts/setup.mjs`)**:
  - Added `deriveDefaultTeamSlug` and `ensureZeroTrustOrganization` to inspect `GET /accounts/{account_id}/access/organizations` during `pnpm run setup`, prompt for a Zero Trust team subdomain (`<team>.cloudflareaccess.com`) when none exists, and provision the organization via `POST /accounts/{account_id}/access/organizations`.
  - Updated `updateAdminApiAccessVars` to warn when `CF_ACCESS_TEAM_DOMAIN` changes from a previous non-empty value so administrators know to clear browser cookies for the old team domain.
- **Test Isolation & Unit Coverage (`tests/setup-script.test.js`, `tests/admin-api-worker.test.js`)**:
  - Added unit tests for `deriveDefaultTeamSlug`, `ensureZeroTrustOrganization`, `updateAdminApiAccessVars` mismatch warnings, and `configureCloudflareAccess` team name handling.
  - Updated `tests/admin-api-worker.test.js` `unstable_dev` config to explicitly reset `CF_ACCESS_AUD` and `CF_ACCESS_TEAM_DOMAIN` in test mode so local `wrangler.toml` overrides do not break integration tests.
- **Documentation (`README.md`, `docs/domain-and-dns-setup.md`)**:
  - Documented automated Zero Trust organization detection/provisioning and added `Account > Access: Organizations, Identity Providers, and Groups -> Edit` to the API token requirements table.

### Preset Section Templates & Theme Preview Relocation
- **Preset Section Templates (`migrations/0012_new_preset_section_templates.sql`)**:
  - Seeded 5 new locked built-in section templates: `pricing` (Pricing Table), `stats` (Stats Bar), `logo-cloud` (Logo Cloud), `team` (Team Grid), and `steps` (Process Steps).
  - Authored theme-adaptive MiniJinja templates using design tokens (`--color-surface`, `--color-accent`, `--color-border`, `--color-text`, `--color-text-muted`, `--border-radius`, `--box-shadow`, `color-mix`) with zero `SELECT *` migrations.
- **Theme Preview Page Showcase (`migrations/0012_new_preset_section_templates.sql`, `scripts/seed_theme_preview.mjs`)**:
  - Updated `/theme-preview` entry's `body_json` with realistic seed data showcasing all 15 preset section templates.
  - Updated `search_text` indexing to include all 15 template keywords.
  - Updated `scripts/seed_theme_preview.mjs` to target migration 0012 and seed all 15 preset templates.
- **Navigation & Header Relocation (`packages/admin-ui/src/pages/TemplatesList/components/TemplatesHeader.tsx`, `migrations/0012_new_preset_section_templates.sql`)**:
  - Relocated the "Preview" link from the public site footer navigation into the Admin UI `TemplatesHeader` as an inline link (`Templates <Link href="/theme-preview" target="_blank" rel="noopener noreferrer">Preview</Link>`).
  - Removed `/theme-preview` from `menus` where `name = 'footer'`.
- **Quality Gates & Test Coverage**:
  - Expanded Rust SSR tests in `packages/public-worker/src/views.rs` to assert all 15 section templates render under both `Modern Editorial` and `Bento-Brutalism` themes.
  - Added assertions in `tests/public-worker.test.js` verifying that all 15 templates render under `/theme-preview` and that the footer navigation no longer contains the preview link.
  - Added unit and Storybook assertions in `TemplatesList.test.tsx` and `TemplatesList.stories.tsx`.

### Public SSR Navigation, Section Template Guards & RichText Link Polish
- **Active Navigation State (`packages/public-worker/src/views.rs`, `packages/core/src/models/layout_defaults.rs`, `migrations/0011_template_and_nav_fixes.sql`)**:
  - Injected `current_path` across all public SSR rendering contexts (`render_index_internal`, `render_post_internal`, `render_page_internal`, `render_doc`, `render_search_html`).
  - Updated header and footer navigation loops across all default and D1 layout templates (`index`, `post`, `page`, `doc`, `search`) to emit `aria-current="page"` when `item.url == current_path`.
- **Blog Archive Page Title (`packages/public-worker/src/views.rs`)**:
  - Updated `page_title()` so `/posts` and `/post` render `Blog — {site_title}` instead of `Home — {site_title}` when no custom heading is set.
- **Section Template Guards & Brutalist Button Borders (`migrations/0011_template_and_nav_fixes.sql`)**:
  - Guarded optional `title`, `image`, and `image_position` (defaulting to `right`) in the `text-image` section template to prevent empty `<h2></h2>` tags, broken `image-` class names, and empty `<img src="">` frames when fields are left blank.
  - Added `border: 1px solid var(--color-border, ...)` and `box-shadow` token support to `.hero-btn` and `.cta-button` in the `hero` and `call-to-action` section templates.
- **Internal vs. External Links (`packages/admin-ui/src/components/RichTextEditor/hooks/useRichTextEditor.ts`, `RichTextEditor.test.tsx`)**:
  - Configured TipTap `Link` extension with `HTMLAttributes: { target: null, rel: null }` so relative/internal links stay in the same tab without `nofollow`, while external `http(s)://` links open in a new tab with `rel="noopener noreferrer"`.

### Full-Width Carousel Section Extension
- **Section & Track Dimensions (`migrations/0001_initial_schema.sql`, `migrations/0005_theme_preview_seed.sql`, `migrations/0010_carousel_full_width.sql`)**:
  - Updated `.section-carousel` container to remove left/right padding (`padding: 5rem 0;` desktop, `padding: 3rem 0;` mobile), enabling wall-to-wall section background extension across all viewports.
  - Removed `max-width: 1200px` and centering margins from `.carousel-track`. Configured track with `width: 100%`, `box-sizing: border-box`, and `5rem` horizontal padding (`padding: 0 5rem 1.5rem;` desktop, `padding: 0 1.25rem 1.5rem;` mobile) so slides span the entire screen width with edge-aligned padding.
  - Created D1 migration `0010_carousel_full_width.sql` and updated baseline seed templates (`0001`, `0005`).
- **Integration Testing (`tests/public-worker.test.js`)**:
  - Added assertions in public worker integration tests verifying `.section-carousel` and `.carousel-track` full-width styles.


### Edge Cache Purge Reliability & Clear Cache Button
- Purges now cover both `www` and apex hosts, and log the Cloudflare API response (status and body) to `wrangler tail` instead of failing silently.
- Theme and layout changes purge the entire host so every cached page picks up the new stylesheet.
- Scheduled publishing purges now use absolute URLs built from the canonical origin (they were relative and never reached Cloudflare).
- New admin-only `POST /api/cache/clear`, a "Clear Cache" card on the Settings page, and matching WebMCP (`clear_cache`) and `zygo-mcp` (`zygo_clear_cache`) tools. It rotates `cache_bust_nonce` so `styles_hash` changes (covering style-only code deploys) and purges all cached content.

### Header Improvements: Optional Site Tagline & Dark Mode Logo
- **Optional Header Site Tagline (`packages/core`, `packages/public-worker`, `packages/admin-ui`)**:
  - Removed hardcoded default taglines from built-in theme presets (`modern_editorial`, `bento_brutalism`) in `zygo-core` and Admin UI ThemeEditor constants, making tagline default to nothing (`""`).
  - Removed fallback `.unwrap_or("An Editorial Review & Journal")` from `inject_theme_context` in `packages/public-worker/src/views.rs`, ensuring `<div class="site-tagline">` is completely omitted from public SSR HTML when empty or unconfigured.
  - Updated ThemeEditor's tagline input placeholder to `"Optional site tagline"`.
- **Dark Mode Site Logo (`packages/core`, `packages/public-worker`, `packages/admin-ui`, `migrations/0009_dark_mode_site_logo.sql`)**:
  - Added `site_logo_dark` setting key with full support across settings form values and API schemas.
  - Implemented responsive `<picture class="site-logo-picture"><source srcset="{{ site_logo_dark|safe }}" media="(prefers-color-scheme: dark)"><img src="{{ site_logo|safe }}" alt="{{ site_title }}" class="site-logo"></picture>` in public SSR templates (`layout_defaults.rs` and `views.rs`), seamlessly falling back to `site_logo` when dark mode is inactive or unset.
  - Added `.site-logo-picture` CSS styling in `public/style.css` and `packages/public-worker/src/style.css`.
  - Created D1 migration `0009_dark_mode_site_logo.sql` upgrading existing stored layout templates in D1.
  - Added Site Logo (Dark Mode) upload control in `BrandingSettingsCard.tsx` with dedicated Media Picker flow, clear button, and high-contrast dark preview container (`var(--gray-12)`).
  - Updated ThemeEditor `PreviewHeader` and `ThemePreview` to render the responsive `<picture>` dark logo element in live preview.
- **Dual WebMCP & `zygo-mcp` Parity**:
  - Maintained full parity across in-browser WebMCP (`packages/admin-ui/src/lib/webmcp/themeAndMediaTools.ts`) and backend CLI MCP bridge (`packages/zygo-mcp/index.mjs`) for `site_logo_dark` and empty tagline defaults.
- **Quality Gates Verification**:
  - Passed 123 Rust unit tests (`cargo test`), 648 Vitest tests across 75 test files (`pnpm run test:all`), TypeScript check (`tsc --noEmit`), production build (`pnpm run build`), and Storybook build (`build-storybook`).

### Theming, Site Branding & Edge Cache-Busting Enhancements
- **Branding Image Previews & Fallbacks (`packages/admin-ui`)**: Fixed phantom checkbox artifact in "Site Branding & Social" settings caused by broken image fallback styling. Implemented `resolveMediaUrl` using `getPublicSiteUrl` to correctly resolve relative `/media/` paths to the public site and render clean placeholder messages (`Unable to load image preview`) on error.
- **Preset Header Logo & Footer Copyright Rendering (`migrations/0008_sync_branding_in_layout_templates.sql`, `packages/public-worker`, `packages/admin-ui`)**: Created D1 migration and updated baseline seed templates (`0004`, `0005`) to conditionally render `site_logo` in headers (falling back to `site_title`) and copyright footer text across all layouts (`post`, `page`, `doc`) for `Modern Editorial` and `Bento-Brutalism` presets. Updated ThemeEditor preview headers (`centered`, `split`, `stacked`) and added dynamic copyright year interpolation to ThemePreview footer.
- **Edge Cache-Busting & Cloudflare Purge Synchronization (`packages/core`, `packages/admin-api-worker`, `packages/public-worker`)**: Added `compute_theme_styles_hash` in `zygo-core` incorporating theme tokens into the layout template `styles_hash`. Automated `styles_hash` recomputation and cache purging on `POST /api/settings` for theme updates. Resolved `CF_API_TOKEN` from worker secrets and filtered purge payloads to valid absolute URLs (`http://`, `https://`) to eliminate Cloudflare API 1012 errors.


### Cloudflare AI Crawl Control (Setup, Edge API, Admin UI & MCP)
- **Interactive Setup CLI (`scripts/setup.mjs`)**: Added AI crawl protection configuration prompt to interactive setup wizard (`block_all`, `allow_search_only`, `custom`, `disabled`) with automated `CF_ZONE_ID` synchronization to `packages/admin-api-worker/wrangler.toml` and direct Cloudflare Bot Management API configuration via `applyAiCrawlSettings`.
- **Authenticated Cloudflare Edge Proxy (`packages/admin-api-worker`)**: Added authenticated `GET` and `PUT` `/api/cloudflare/ai-crawl` endpoints in `packages/admin-api-worker/src/handlers/cloudflare.rs` with `auth_required!`, supporting `ai_bots_protection`, `ai_search`, `ai_training`, and `ai_user` settings via Cloudflare's Bot Management API with graceful fallback when zone credentials are not configured.
- **Admin UI Settings Module (`packages/admin-ui`)**: Created `AiCrawlSettingsCard` under `packages/admin-ui/src/pages/Settings/components/` with master toggle, quick policy presets ("Block All", "Allow AI Search", "Allow All"), granular policy dropdowns, and unconfigured credential alerts. Integrated live values and form mutation directly into the overall Settings page save workflow.
- **Dual WebMCP & `zygo-mcp` Parity**: Added `get_ai_crawl_settings` and `update_ai_crawl_settings` across browser WebMCP (`packages/admin-ui/src/lib/webmcp/themeAndMediaTools.ts`) and backend CLI MCP bridge (`packages/zygo-mcp/index.mjs`).
- **Comprehensive Quality Gates & Testing**: Added unit tests in `tests/setup-script.test.js`, worker endpoint tests in `tests/admin-api-worker.test.js`, React component and page tests in `AiCrawlSettingsCard.test.tsx` and `Settings.test.tsx`, MCP tool coverage in `tests/zygo-mcp.test.js`, and Storybook stories (`AiCrawlSettingsCard.stories.tsx` and `WithAiCrawlConfigured`).


### Custom 301/302 Redirects & Marketing URLs Manager (with QR Code Generator)
- **D1 Schema & Edge Routing (`migrations/0007_redirects.sql` & `packages/public-worker`)**: Created `redirects` table (`id`, `source_path`, `target_url`, `status_code`, `notes`, `hit_count`, timestamps) with unique index on `source_path`. Integrated edge redirect resolution in `packages/public-worker/src/handlers/public.rs` before 404 fallbacks, supporting internal relative path resolution against canonical origin, asynchronous hit counting, and edge caching for 301 responses.
- **Shared Rust Models & Database Layer (`zygo-core`)**: Defined `Redirect`, `CreateRedirectReq`, and `UpdateRedirectReq` structs in `packages/core/src/models/redirect.rs` with `#[serde(default)]` and `#[serde(skip_unknown_fields)]`. Implemented `get_all`, `find_by_source_path`, `find_by_id`, `create`, `update`, `delete`, and `increment_hit_count` in `packages/core/src/db/redirect.rs` strictly using explicit column names and safe SQL `NULL` bindings.
- **Admin REST API & Cache Invalidation (`packages/admin-api-worker`)**: Added authenticated CRUD endpoints (`GET /api/redirects`, `POST /api/redirects`, `PUT /api/redirects/:id`, `DELETE /api/redirects/:id`) with `auth_required!`, validation against loop redirects and reserved system prefixes, and automated edge cache purging (`cache::purge_urls`) on changes.
- **Admin UI Module & QR Code Dialog (`packages/admin-ui`)**: Created modular `Redirects` page (`types.ts`, `useRedirects.ts`, `RedirectModal.tsx`, `Redirects.tsx`, `index.ts`) under `packages/admin-ui/src/pages/Redirects/` with search filtering, status badges, one-click path copying, and integrated `QRCodeDialog` triggers on every row. Added **Redirects** to the sidebar navigation under `Content` in `Layout.tsx` and configured route in `App.tsx`.
- **Dual WebMCP & `zygo-mcp` Parity**: Added `list_redirects`, `create_redirect`, `update_redirect`, and `delete_redirect` tools across in-browser WebMCP (`packages/admin-ui/src/lib/webmcp/redirectTools.ts`) and the standalone CLI MCP server (`packages/zygo-mcp/index.mjs`).
- **Comprehensive Quality Gates & Testing**: Added unit tests in `models::redirect`, MSW integration tests in `Redirects.test.tsx` (7 tests covering rendering, empty states, search filtering, QR code triggers, modal workflows, loop validation, and deletion), and Storybook stories in `Redirects.stories.tsx`. Passed 118 Rust unit tests, 627 Vitest tests across 74 test files, TypeScript check, and production build verification.


### Zero-Trust Auth Hardening (`workers_dev = false` & RS256 JWT Signature Verification)
- **`workers_dev = false` Enforcement**: Enforced `workers_dev = false` across `packages/admin-api-worker/wrangler.toml`, `packages/admin-ui/wrangler.toml`, and `packages/public-worker/wrangler.toml` to prevent public `.workers.dev` routing bypasses.
- **Scaffolding & Provisioning Automation (`scripts/setup.mjs` & `create-zygo-app`)**: Updated setup script to ensure `workers_dev = false` is maintained across all worker configs and automatically populate `CF_ACCESS_AUD` and `CF_ACCESS_TEAM_DOMAIN` in `packages/admin-api-worker/wrangler.toml` during Cloudflare Access app and policy creation. Preserved `workers_dev = false` during `create-zygo-app` project bootstrapping.
- **In-Memory JWKS Fetching & Caching (`packages/admin-api-worker/src/auth.rs`)**: Implemented dynamic fetching of Cloudflare Access public signing keys from `/cdn-cgi/access/certs` with a 1-hour in-memory cache and a 10-second DoS refetch throttling window.
- **Cryptographic RS256 JWT Verification**: Integrated `rsa` and `sha2` crates in Rust Wasm to parse JWK RSA keys and verify RSA PKCS#1 v1.5 SHA-256 signatures on incoming `Cf-Access-Jwt-Assertion` tokens alongside strict issuer (`iss`), audience (`aud`), expiration (`exp`), and not-before (`nbf`) claim validation.
- **SSRF Mitigation & Test Environment Decoupling**: Enforced strict domain checks on token issuers (`iss`), requiring trusted Cloudflare Access hostnames matching `https://<team>.cloudflareaccess.com`. Decoupled test environments (`ENVIRONMENT=test`) and local development (`ENVIRONMENT=dev`) for fast, offline unit and integration test execution.
- **Full Test Coverage**: Added comprehensive Rust unit tests covering valid/tampered signatures, unsupported algorithms, missing key ID, untrusted issuer, expired tokens, and audience mismatch, and updated CLI/integration tests (`tests/setup-script.test.js`, `tests/create-zygo-app.test.js`, `tests/admin-api-worker.test.js`).

### Client-Side Multi-Tier Image Optimization & Responsive `<img>` Pipeline
- **Browser-Side 3-Tier WebP Pipeline (`imageOptimization.ts`)**: Built client-side image processing utility generating `thumb` (400px, 80%), `md` (1024px, 82%), and `lg` (2048px, 85%) WebP blobs using `createImageBitmap` and `<canvas>`, with automatic bypass for non-raster assets (SVG, animated GIF, video) and dimension capping without upscaling.
- **Atomic Multi-Part Storage & Rollback (`admin-api-worker`)**: Enhanced `upload_media` in `packages/admin-api-worker/src/media.rs` to accept `multipart/form-data` payloads, uploading multi-tier variants under deterministic R2 keys (`*__thumb.webp`, `*__md.webp`) while maintaining a single D1 row, with cascading deletion on `delete_media` and automatic atomic rollback of all R2 objects on D1 insert failure.
- **Worker `?size=` Resolution & Resilient Fallback (`admin-api-worker` & `public-worker`)**: Updated media streaming handlers to resolve `?size=thumb|md` with automatic edge fallback to base assets when variants are missing (e.g. legacy assets or SVGs), serving with immutable 1-year cache headers. Updated `sync_r2_to_d1` across both workers with `is_media_variant_key` filter.
- **MiniJinja `media_srcset` Filter (`zygo-core`)**: Registered a shared MiniJinja filter in `packages/core/src/template_engine.rs` generating responsive `srcset` markup (`{url}?size=thumb 400w, {url}?size=md 1024w, {url} 2048w`) for local WebP images.
- **Built-in Template Responsive Image Markup & D1 Migration (`0006_responsive_media_templates.sql`)**: Updated built-in section templates (`hero` with `fetchpriority="high"`, `text-image`, `gallery`, `image-carousel` with `loading="lazy" decoding="async"`, and `feature-grid`, `testimonial` with `?size=thumb`), layout defaults (`DEFAULT_POST_HTML`, `DEFAULT_PAGE_HTML`), and seeded layout migrations with responsive image attributes.
- **Admin UI Thumbnails (`MediaCard` & `MediaPickerModal`)**: Updated `MediaThumbnail` component to support `size="thumb"` in `MediaCard` and `MediaPickerCard`, keeping canonical URLs clean for copying and editor insertion.
- **Comprehensive Test Coverage**: Added Vitest unit tests in `imageOptimization.test.ts`, updated `MediaThumbnail.test.tsx`, `Media.test.tsx`, `MediaPickerModal.test.tsx`, and Rust unit tests in `models::media` and `template_engine`.

### Site Branding, Favicon, Default OG Image & Footer Settings
- **Public SSR Template & Layout Engine Injection (`public-worker` & `zygo-core`)**: Updated `inject_theme_context` in `packages/public-worker/src/views.rs` to expose `site_logo`, `site_favicon`, `default_og_image`, `footer_text`, and dynamically compute `og_image` (with origin resolution and cover image precedence). Synchronized all built-in layout templates (`DEFAULT_INDEX`, `DEFAULT_POST`, `DEFAULT_PAGE`, `DEFAULT_SEARCH`, `DEFAULT_DOC`) and core layout defaults (`DEFAULT_POST_HTML`, `DEFAULT_PAGE_HTML`, `DEFAULT_DOC_HTML` in `packages/core/src/models/layout_defaults.rs`).
- **Synchronized Public Stylesheets**: Added `.site-logo` (with responsive max-height and object-fit) and `.footer-text` (with centered layout adaptation) across both `packages/public-worker/src/style.css` and `public/style.css`.
- **Admin UI Branding Settings Card (`BrandingSettingsCard.tsx`)**: Created `BrandingSettingsCard` under `packages/admin-ui/src/pages/Settings/components/` with integrated `MediaPickerModal` browsing, URL input bindings, live thumbnail previews, and instant clear actions for site logo, favicon, and default social share image, alongside custom footer copyright text.
- **Form State & API Integration**: Extended `SettingsFormValues` and `SettingsApiResponse` in `types.ts` and `useSettingsForm.ts` to seamlessly populate, edit, dirty-track, and persist branding settings to the D1 `settings` table via batch `POST /api/settings`.
- **Dual WebMCP & `zygo-mcp` Tool Parity**: Added `get_settings` and `update_settings` tools to browser WebMCP (`themeAndMediaTools.ts`) and backend CLI MCP bridge (`packages/zygo-mcp/index.mjs`) ensuring human-agent parity for configuring branding, canonical origin, and CMS options.
- **Testing & Storybook Coverage**: Added Rust unit tests (`test_site_branding_and_og_rendering`), Admin UI Vitest tests (`Settings.test.tsx`), WebMCP tests (`WebMCPThemeMedia.test.tsx`), MCP stdio CLI tests (`tests/zygo-mcp.test.js`), and Storybook stories (`WithBrandingConfigured` in `Settings.stories.tsx`).

### Editor Module Follow-Ups & WebMCP Parity
- **Section Expansion Coordination & WebMCP `onExpandSection` Wiring**: Created `EditorUIStateContext` (`EditorUIStateProvider`, `useEditorUIState`) to coordinate section expansion state (`expandedByIndex`, `setSectionExpanded`, `toggleSectionExpanded`) and title editing state across editor subcomponents. Connected `useEditorWebMCP` to pass `onExpandSection`, ensuring newly inserted sections via `editor_add_section` automatically expand in `SectionList`.
- **Title Editing State Coordination**: Connected `TitleEditor` to `EditorUIStateContext` so programmatic title updates via WebMCP (`editor_set_metadata`) immediately exit inline editing mode and switch the UI to the prominent Heading view.
- **Performance Optimization (Eliminated Keystroke Re-renders)**: Enhanced `UseTipTapWebMCPOptions` with `getFormValues?: () => Record<string, any>` in `entryTools.ts` and refactored `useEditorWebMCP.ts` to drop whole-form `useWatch({ control })`. Handlers now resolve live values on demand at tool execution time, eliminating whole-form re-renders on every keystroke.
- **WebMCP Parity Integration Test Suite (`useEditorWebMCP.test.tsx`)**: Created comprehensive Vitest integration tests verifying that `useEditorWebMCP` properly registers tools, retrieves fresh RHF form values dynamically, mutates metadata and content, coordinates title edit mode, and executes section additions/updates/removals/reorders.
- **Subcomponent Storybook Coverage**: Authored dedicated Storybook stories for key editor subcomponents under `packages/admin-ui/src/pages/Editor/components/`: `TitleEditor.stories.tsx` (NewEntry, ExistingEntry, LongTitle), `EditorHeader.stories.tsx` (NewPostDraft, SavedPage, UnsavedDoc), and `LivePreviewPane.stories.tsx` (DefaultEmpty, RenderedPost, RenderedPageWithSections).

### Bulk Content Operations: Posts & Pages Lists
- **Unified Batch REST API (`/api/entries/bulk`)**: Implemented a consolidated `POST /api/entries/bulk` endpoint in `packages/admin-api-worker` supporting `publish`, `unpublish`, `trash`, `add_tags`, and `remove_tags` actions. Enforces RBAC permissions (authors can only modify their own entries), protects system pages (e.g. Home page and Docs Home page cannot be deleted), prevents orphan child pages, and invalidates affected canonical URLs, categories, tags, and edge caches in a single network round-trip.
- **Shared Core Database Models & Queries (`zygo-core`)**: Defined `BulkActionType`, `BulkEntriesRequest`, and `BulkEntriesResponse` structs with `#[serde(default)]` resilience. Added `bulk_update_status`, `bulk_delete_entries`, and `bulk_modify_tags` functions in `packages/core/src/db/entry.rs` with explicit column naming (`LIST_COLUMNS`) and cycle/orphan safety.
- **Admin UI Selection & Floating Actions Toolbar (`BulkActionBar`)**: Created the accessible `BulkActionBar` component with row-level checkboxes, select-all table header checkboxes with indeterminate state support, and dedicated confirmation dialogs (`BulkTrashDialog` and `BulkTagDialog`). Integrated across both `PostsList` and `PagesList`.
- **WebMCP Parity (`bulk_entries_operation`)**: Registered the `bulk_entries_operation` tool in `packages/admin-ui/src/lib/webmcp/entryTools.ts` enabling AI agents to query and execute batch publish, unpublish, trash, and tagging actions with `dry_run` simulation support.
- **Test & Storybook Coverage**: Added Vitest test suites for `BulkActionBar.test.tsx`, `PostsList.test.tsx`, `PagesList.test.tsx`, and `WebMCPEntries.test.tsx`, alongside Storybook stories in `BulkActionBar.stories.tsx`.

### WebMCP Editor Parity: Template, Theme & Navigation Editors
- **Template Editor WebMCP Parity (`templateTools.ts`)**: Closed the programmatic editing loop for section templates with `template_set_metadata` (slug `id`, `name`, `description`, `is_locked`), `template_save` (initiating syntax validation, Prettier formatting, and backend persistence with optional `force` bypass), and `template_discard_draft` (clearing `localStorage` draft buffer and restoring saved values), wired through `useTemplateAgentBridge` and `useTemplateEditorState`.
- **Theme Editor WebMCP Parity (`themeAndMediaTools.ts`)**: Added `theme_save_active` (persisting active in-memory tokens to settings and clearing the dirty navigation blocker), `theme_save_as_custom` (persisting current tokens under a user-defined custom theme name), and `theme_select_preset` (switching between theme presets or applying typography pairings by name) wired into `ThemeEditor.tsx` and `useThemeEditorState.ts`.
- **Site Navigation Editor WebMCP Parity (`navigationTools.ts`)**: Created the `useNavigationEditorWebMCP` hook mounted in `Navigation.tsx` exposing contextual tools `navigation_get_active_state`, `navigation_set_tab`, `navigation_add_item`, `navigation_delete_item`, `navigation_set_items`, and `navigation_save`. Updated the global `update_menu_items` tool to dispatch `zygo:menus-updated` CustomEvents to keep mounted navigation views and React Query caches in sync.
- **Automated Test Coverage**: Added comprehensive Vitest integration tests in `WebMCPTemplates.test.tsx` and `WebMCPThemeMedia.test.tsx` validating tool registration, argument schemas, state mutations, and unmount cleanup across all new WebMCP tools.

### Admin UI Form & Control Accessibility Remediation
- **Programmatic Label Association (`htmlFor` + `id`)**: Audited and wired all 54 `<Text as="label">` elements across `packages/admin-ui` to their corresponding Radix Themes controls (`TextField.Root`, `TextArea`, `Select.Trigger`, and `Switch`) in `LinksTab` (`CanonicalUrlCard`, `CreateLinkDialog`), `SectionFieldRenderer` (`useId()`-based dynamic bindings), `VisualFieldBuilder` (`FieldCard`, `SubfieldCard`), `ThemeEditor` (`ColorTokensPanel`, `TypographyPanel`, `LayoutDimensionsPanel`, `HeaderStylingPanel`, `SaveAsDialog`), `Settings` (`GeneralSettingsCard`, `AnalyticsSettingsCard`, `DocsSettingsCard`), `Navigation` (`AddMenuItemForm`, `PageSelectCombobox`), `TemplateMetadataCard`, and `Users` (`InviteUserDialog`, `EditUserDialog`).
- **Zero Orphan `<label>` Elements on Non-Labelable Controls**: Replaced orphan `<Text as="label">` headers above non-input groups (button toggles, media pickers, rich text editors, and card grids) with `<Text as="div" id="...">` paired with `role="group"` or `role="radiogroup"`, `aria-labelledby`, `aria-pressed`, and `aria-checked` across `HeaderStylingPanel`, `StatusField`, `CoverImageField`, `PostBodyField`, `SectionList`, and `SectionFieldRenderer`.
- **Error Alerts & Helper Descriptions (`aria-invalid` & `aria-describedby`)**: Connected validation alerts (`role="alert"`) and helper instructions to form controls via `aria-invalid` and `aria-describedby` in `SectionFieldRenderer`, `HierarchyFields`, `AddMenuItemForm`, `TypographyPanel`, `GeneralSettingsCard`, `AnalyticsSettingsCard`, `DocsSettingsCard`, `InviteUserDialog`, and `EditUserDialog`.
- **Accessible Names for Standalone Controls (`aria-label`)**: Added explicit `id` and `aria-label` attributes to all search bars (`DocsSearchBar`, `MediaSearchBar`, `PagesSearchBar`, `PostsSearchBar`, `TemplatesSearchBar`, `UsersTable`, `MediaPickerToolbar`), `AddSectionSelect`, and collapsed sidebar navigation controls (`QuickCreateMenu`, `NavItem`).

### `create-zygo-app` CLI Scaffolder
- **Standalone Project Bootstrapping (`packages/create-zygo-app`)**: Interactive `@clack/prompts` CLI (`npx create-zygo-app <project-dir>`) with non-interactive (`--yes`) and offline/local template (`--template-dir`) modes, fetching via shallow `git clone` with automatic GitHub tarball fallback.
- **Monorepo Sanitization (`sanitizeProject`)**: Automatically strips internal directories and scripts (`ROADMAP.md`, `CHANGELOG.md`, `docs/specs/`, `docs/audits/`, `docs/official/`, `docs/github-ruleset-setup.md`, `scripts/seed_official_docs.mjs`, `.github/`, `packages/create-zygo-app/`, `tests/create-zygo-app.test.js`, `HANDOFF_*.md`, and root scratch scripts) and updates `package.json`.
- **Clean `wrangler.toml` & Local Dev Defaults**: Strips hardcoded `zygodactylstudios.com` routes and replaces internal `database_id`s with `00000000-0000-0000-0000-000000000000` while remaining 100% compatible with `scripts/setup.mjs` for production provisioning; generates `.dev.vars` (`ENVIRONMENT=dev`) and `.env.development` out of the box.
- **Automated Local Initialization**: Runs `pnpm install`, compiles `template-wasm` and worker/UI bundles (`pnpm run build`), applies local D1 migrations (`pnpm run db:migrate:local`), and initializes a fresh Git repository (`git init`), with granular `--skip-*` flags.

### Editor Functional & Data Integrity
- **Form & Section Template Validation (`validateEntryForm.ts`)**: Native `react-hook-form` resolver enforcing slug format, reserved system slugs, duplicate slug detection, `canonicalUrl` HTTP/HTTPS validation, `schemaJson` object validation, `parentId` positive integer & non-self-reference validation, and `SectionTemplateField.required` enforcement across `text`, `richtext`, `boolean`, and `list` fields. Blocks Save/Publish while allowing preview saves, and auto-switches tabs / auto-expands sections when cross-tab or collapsed-section errors occur.
- **Entry Query Loading & Error States (`useEditorData.ts` & `EditorStatusView.tsx`)**: Added accessible loading (`role="status"`) and error (`role="alert"` with Retry and Back buttons) states when fetching existing entries.
- **Persistent Section Expansion State (`SectionList.tsx`)**: Replaced volatile RHF `field.id` expansion keying with index-keyed persistence (`expandedByIndex`) that shifts cleanly on move/remove and survives `reset(getValues(), { keepValues: true })` across saves.
- **Zero-Flash First Save Navigation (`useSaveEntry.ts` & `Editor.tsx`)**: Seeds `['editorEntry', id]` in React Query cache and preserves the `EditorForm` session key on `/editor/new` -> `/editor/:id` transitions so the form stays mounted without flashing empty values or losing the `"Saved to Edge"` badge.
- **Accessible Labels & Error Announcements**: Wired `htmlFor`/`id`, `aria-invalid`, `aria-describedby`, and `role="alert"` across `SlugField`, `MetadataTab`, `HierarchyFields`, and `SectionFieldRenderer`.

### Admin UI Full Page Modularization & State Modernization
- **100% Page Module Coverage**: Completely decomposed all remaining flat page files into colocated, modular packages under `packages/admin-ui/src/pages/` (`Analytics`, `Dashboard`, `DocsList`, `DocsTemplateEditor`, `Editor`, `Media`, `Navigation`, `NotFound`, `PagesList`, `PostsList`, `PostsTemplateEditor`, `Settings`, `TemplateEditor`, `TemplatesList`, `Theme`, `Users`).
- **File Length & Decomposition Hygiene**: Enforced `<200` line soft limit (`<300` hard limit) across every component file by extracting local subcomponents (`components/`) and isolating state/effects into custom hooks (`hooks/`).
- **URL-Driven State Modernization**: Migrated search and filter states across list views (`DocsList`, `TemplatesList`, `PagesList`, `PostsList`) from local `useState` to React Router `useSearchParams` (`?q=...`), providing bookmarkable URLs, browser back/forward history support, and reload resilience.
- **Form Modernization**: Applied `react-hook-form` patterns with `FormProvider` and context hooks across multi-field views.
- **Colocated Testing & Storybook (1+2+4 Protocol)**: Colocated Vitest unit/integration tests (`<Page>.test.tsx`) and Storybook stories (`<Page>.stories.tsx`) with memory data router configurations for every page module, exporting public APIs cleanly via `index.ts` barrel files to guarantee zero import regressions.

### Admin Editor `react-hook-form` Refactor & Modularization
- **Form State**: Replaced ~15 `useState`s, manual `resetForm`, and hand-built dirty snapshots in the 1,100-line `pages/Editor.tsx` with a single `react-hook-form` instance (`EntryFormValues`); `isDirty` now comes from the form.
- **Module Layout**: `pages/Editor/` with `EditorForm` -> `EditorLayout` -> `EditorHeader`, `EditorTabs` (`ContentTab`, `MetadataTab`, `SocialPreviews`), `LivePreviewPane`, plus hooks `useEditorData`, `useEntryType`, `useSaveEntry`, `useWasmPreview`, `useEditorWebMCP` and utils `slugify`, `buildEntryPayload`, `toFormValues`, `ENTRY_TYPE_CONFIG`.
- **Fixes**: Stable `useFieldArray` ids for page sections (no index keys), save baseline reset from live values, removed duplicate tab handlers and a dead preview-save branch, and cleanup of the "Saved" flash timer.

### WebMCP Browser Bridges & Page Section Tools
- **Global Browser Bridges (`window.webmcp` & `navigator.modelContext`)**: Synchronized `WebMCPRegistry` with W3C/Chrome `navigator.modelContext` (`registerTool`, `unregisterTool`, `provideContext`, `executeTool`) and exposed `window.webmcp` for direct in-browser RPC tool execution.
- **Page Editor Section & Metadata Parity**: Added `editor_get_section_templates`, `editor_add_section`, `editor_update_section`, `editor_remove_section`, `editor_move_section`, `editor_set_sections`, and full metadata coverage (`cover_image`, `canonical_url`, `schema_json`, `parent_id`, `sort_order`) in `entryTools.ts` and `Editor.tsx`.
- **Interactive Tool Runner & Batch RPC Console**: Added inline per-tool execution and a JSON batch `RPC Console` tab in `WebMCPAssistantDrawer.tsx`.

### Two-Worker Architecture
- **Separated Responsibilities**: Split Zygo CMS into two independent Cloudflare Workers (`public-worker` and `admin-api-worker`) and a shared `core` package.
- **Public Worker (Reader)**: Ultra-lean, minimal dependencies, read-only D1 queries, and aggressive edge caching.
- **Admin Worker (Writer)**: Handles authentication, media uploads, and heavy authoring libraries.

### Scheduled Publishing
- **Scheduled Cron Trigger**: Integrated a background cron event (`#[event(scheduled)]`) that automatically transitions posts to "published" status when their `published_at` time arrives, and purges the edge cache.

### Custom Content Types & Schema Builder
- **Schema Builder**: Interface at `/admin/content-types` to define custom entities (e.g., `Product`, `Event`) and construct dynamic JSON schemas with field types (text, number, boolean, date).
- **Editor Integration**: Dynamically renders custom form inputs in the editor sidebar based on the selected content type.
- **JSON Storage**: Safely persists structured data into the `custom_fields_json` D1 column.

### Analytics Dashboard
- **Admin Analytics View**: Integrated a lightweight, built-in privacy-first traffic insights dashboard in the admin UI without requiring a cookie banner.

### Full-Text Site Search
- **Server-Side Search**: Implemented a native server-side search route at `/search` using SQLite FTS5 queries across all published content.

### Testing Architecture
- **Two-Tier Test Suite**:
  - **Level 1 (DOM & Real Templates)**: Vitest + HappyDOM + `@testing-library/dom` loading `templates/editor.html` directly from disk with offline CDN stubs (`tests/mocks/esm.js`).
  - **Level 2 (Worker Integration)**: End-to-end integration tests (`tests/worker.test.js`) booting the compiled Rust Wasm worker via Wrangler `unstable_dev`.
  - **Unit Tests**: `cargo test --lib` covering models, excerpt generation, validation, and metadata logic.
- **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/deploy.yml`) with automated caching, linting, tests, remote D1 migrations, and release deployment.

### Navigation & Menu Builder
- **Dynamic UI**: Implemented an intuitive, vanilla JS Navigation Builder at `/admin/navigation` allowing admins to visually build out infinitely-nesting JSON tree structures for header and footer menus.
- **Safe Recursive Templating**: Enforced strict 4-level deep recursion guards in pure Rust `render_menu_html` to prevent template parsing panics, stack overflows, and maliciously deep layouts.
- **Smart Cloudflare Cache Purging**: When a menu layout is saved, the backend automatically issues an API call to Cloudflare (`cache::purge_urls`), correctly chunking arrays up to 30 URLs per batch, ensuring navigation changes deploy globally instantly without 400 Bad Request API limits.
- **Robust SQL Updates**: Integrated SQLite `UPSERT` commands to elegantly handle updating menus whether they exist in D1 or not without silent failures.

### User Roles & Permissions (RBAC)
- **JIT Provisioning & Multi-Tenant Support**: First user authenticated via Cloudflare Access is granted `admin`, subsequent users become `author`. Local `users` table created (`0007_create_users_table.sql`) mapping external IDs to internal roles.
- **Granular Backend Guards**: Enforced strict ownership over drafts and content via SQLite queries (`WHERE author_id = ?1`), ensuring authors can only edit and manage their own work, while admins have global access.
- **Unified Auth Middleware**: Upgraded `auth_required!` macro to inject the fully-hydrated local `User` struct into the Request context on every protected route.

### Revisions, Version History & Preview System
- **Decoupled Draft Workflow**: Enables saving draft snapshots without prematurely publishing to public pages or purging edge cache.
- **D1 Revision Tracking**: Created `entry_revisions` table (`0005_create_revisions_table.sql`) snapshotting `title, description, cover_image, body_html, body_json, category, tags, preview_token, created_at` on every create or update.
- **Tokenized Preview Route**: Dedicated `GET /preview/:token` rendering revision snapshots with edge caching strictly bypassed (`Cache-Control: no-store`) and an interactive "Preview Mode" banner linking back to the editor.
- **Version History Drawer & One-Click Rollback**: Modal in `templates/editor.html` and `public/editor.js` fetching revision history via `GET /api/entries/:id/revisions`, allowing instant preview and restoring past content directly into TipTap and form inputs.
- **Cascading Deletion**: Automatic cleanup of all associated revisions when an entry is deleted.

### Editor Child Page Guard & Management
- **Backend Hierarchy Guards**: Enforced backend SQLite deletion guard preventing deletion of parent pages with active children (`entries WHERE parent_id = ?1`), and type-conversion guard blocking conversion of parent pages into posts when subpages exist.
- **Child Page Querying**: Added `db::find_all_children` in `src/db/entry.rs` to fetch all subpages (draft and published) for parent entries.
- **In-Editor Subpage Navigation**: Added "Subpages in this section" card in `templates/editor.html` showing direct edit links, paths, status badges, and "+ Add Subpage" button prepopulating `?parent_id=...`.
- **Guarded Deletion Button**: Delete button is conditionally disabled with tooltip warning (`⚠️ Deletion blocked: page has N subpage(s)`) when child pages exist, and confirms deletion for childless entries.
- **Frontend Type Guard**: Client-side validation in `public/editor.js` alerting and immediately reverting attempts to change page type to post when subpages exist.

### D1 Media Index, Gallery Modal & Sync
- **D1 Media Indexing**: Created `media` table tracking `id, key, filename, mime_type, size_bytes, created_at` with indexes on `filename` and `created_at`.
- **Atomic Upload Rollback**: Image uploads store in R2 and immediately index into D1; if D1 indexing fails, R2 storage automatically rolls back to prevent drift.
- **R2-to-D1 Reconciliation Engine**: Cursor-paginated bucket scanner (`media::sync_r2_to_d1`) diffing R2 objects against D1 keys and backfilling missing entries with inferred filenames and mime types.
- **Runtime & Cost Safety Guards**: Hard 25-second wall-clock timeout ceiling, max 10-page / 10,000-item batch cap, and cursor loop detection to prevent execution overages or runaway loops.
- **Automated Weekly Background Cron**: Configured `[triggers] crons = ["0 0 * * 0"]` in `wrangler.toml` hooked to native `#[event(scheduled)]` in `src/lib.rs` for automated zero-overhead maintenance.
- **Admin On-Demand Sync & Upgraded Modal**: Admin route `POST /api/media/sync`, "Sync Bucket" button, real-time debounced filename search, 6-way sorting, and paginated gallery controls in the editor.

### Post List Pagination
- **Server-Side Pagination**: Added `?page=N` query parameter handling across homepage (`/`), tag archives (`/tag/:tag`), and category archives (`/category/:category`).
- **D1 Limit/Offset Queries**: Implemented `LIMIT ? OFFSET ?` with `LIST_COLUMNS` in `src/db/entry.rs`, backed by count queries to accurately determine total page count.
- **Canonical & SEO Hygiene**: Strictly preserves canonical rules (homepage trailing slash `{origin}/?page=N`, clean page 1 root without query string, page title indicators `(Page N)`).
- **Configurable Page Size**: Defaults to 10 posts per page, overridable via `POSTS_PER_PAGE` environment variable.

### Template Reusability & Sub-Templates
- **Extracted Layout Partials**: Modularized `templates/includes/header.html`, `footer.html`, and `navigation.html` from `base.html`.
- **Reusable Post List & Pagination**: Extracted `templates/includes/post_list.html` and `templates/includes/pagination.html` from `templates/index.html`.

### Reliability, Security & Edge Performance
- **Server-Side HTML Sanitization**: Integrated the `ammonia` crate (backed by Mozilla's HTML5 parser `html5ever`) with custom tag and attribute whitelisting for TipTap content, stripping scripts, iframes, inline event handlers, and pseudo-protocols before persisting to D1.
- **D1 List Query Optimization**: Separated queries into `LIST_COLUMNS` and `ALL_COLUMNS` in `src/db/entry.rs`, omitting heavy `body_html` and `body_json` from dashboard, sitemap, and RSS listings to keep memory well under Cloudflare Worker limits.
- **Admin Dashboard Auth Gate**: Cloudflare Access verification at the edge with default-hidden content and loading state to prevent unauthorized viewing of draft titles.
- **Editor Unsaved Changes Guard**: Dirty state tracking and `beforeunload` event listener in `public/editor.js` to protect authors against accidental data loss.
- **Askama Template Rendering Hygiene**: Clean `render_tmpl` helper eliminating repetitive error mapping closures.

### SEO, Normalization & Metadata
- **Canonical URLs**: `utils::get_canonical_origin` auto-strips `www.` and normalizes domains against `CANONICAL_ORIGIN` / `SITE_URL`.
- **Trailing Slash Rules**: Homepage canonical strictly includes trailing slash (`{origin}/`); post and page canonicals strictly omit trailing slashes (`{origin}/post/:slug`).
- **Schema.org JSON-LD**: Auto-generated structured data for `BlogPosting` and `WebPage` with interactive validation, formatting, and template populator in the editor.
- **Auto Meta Descriptions**: HTML block-tag-aware excerpt generation up to 160 characters.
- **Syntax Highlighting & Code Snippets**: TipTap `</> Code Block` toolbar integration with native `<pre><code>` block generation and Highlight.js styling across editor and public post/page templates.
- **Post Taxonomy (Tags & Categories)**: D1 taxonomy migration (`0002_add_taxonomy.sql`), category and tag input controls in the editor, clickable badges on post cards and post view, and public filtered routes `/category/:category` and `/tag/:tag` with automatic cache purging.

### Edge Caching & Purging
- **Multi-Tier Caching**: Dynamic `EDGE_TTL_SECONDS` environment variable (defaulting to 24h / 86400s) with `Cache-Control` response headers.
- **Worker Cache API**: Programmatic `Cache::default()` integration for edge and local worker caching on all public GET routes (`/`, `/:slug`, `/post/:slug`, `/sitemap.xml`, `/rss.xml`).
- **Active Cache Purging**: Automated cache invalidation on `POST /entries`, `PUT /entries/:id`, and `DELETE /entries/:id` that purges the homepage, affected post/page, sitemap, and RSS feed.
