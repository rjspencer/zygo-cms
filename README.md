# Zygo CMS

A high-performance, edge-native Content Management System built with **Rust**, **Cloudflare Workers** (WebAssembly), **Cloudflare D1** (SQLite at the edge), and **Cloudflare R2** (object storage).

---

## Features

- **Blazing Fast Edge Delivery**: Zero cold-start latency with compiled Rust WebAssembly.
- **Dual Content Storage**:
  - Pre-rendered `body_html` for high-speed public page rendering.
  - ProseMirror/TipTap `body_json` AST for reliable, lossless rich-text editing.
- **Type-Safe Compile-Time Templating**: Uses **Askama** (Jinja/Twig syntax) to compile HTML templates directly into the Wasm binary with zero runtime filesystem overhead.
- **Edge SQLite (D1)**: Fast, ACID-compliant relational data storage with automatic migrations.
- **Integrated R2 Media Pipeline**: Authenticated image uploads with streaming public delivery and caching headers.
- **Publishing Lifecycle**: Draft vs. Published status management with automatic `published_at` timestamping.
- **SEO & Social Metadata**: Automatic Open Graph, Twitter Cards, canonical URLs, and Schema JSON-LD injection.
- **Secure Authentication**: Edge-level zero-trust authentication via **Cloudflare Access** with automatic role assignment.

---

## Tech Stack

- **Language**: Rust (`edition = "2024"`, `wasm32-unknown-unknown`)
- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/) via the `worker` crate (v0.8)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (Edge SQLite)
- **Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/) (Object storage)
- **Templates**: [Askama](https://github.com/rinja-rs/askama)
- **Frontend / Editor**: Vanilla JS + [TipTap](https://tiptap.dev/) + Space Mono & system typography

---

## Project Structure

```text
├── packages/
│   ├── public-worker/         # Public-facing SSR worker (Askama + D1 edge cache)
│   ├── admin-api-worker/      # Authenticated REST API worker (Cloudflare Access + D1)
│   ├── admin-ui/              # Modern React + Vite SPA admin dashboard
│   ├── core/                  # Shared Rust data models and sanitization (zygo-core)
│   └── zygo-mcp/              # MCP server bridge for AI agents
├── migrations/                # D1 SQLite SQL migration scripts
├── scripts/                   # CLI automation scripts
│   └── setup.mjs              # Interactive setup & deployment wizard
├── templates/                 # Shared Askama HTML templates
├── public/                    # Shared static assets served at edge
└── decisions/                 # Architectural decision records
```

---

## Local Development

### 1. Prerequisites

- [Rust](https://rustup.rs/) (stable toolchain)
- Node.js & pnpm
- Cloudflare Wrangler:
  ```bash
  pnpm add -g wrangler
  ```
- Rust WebAssembly target and worker builder:
  ```bash
  rustup target add wasm32-unknown-unknown
  cargo install worker-build
  ```

### 2. Apply Local Migrations

Initialize the local D1 SQLite database:

```bash
npx wrangler d1 migrations apply zygo-cms-db --local -c packages/public-worker/wrangler.toml
```

### 3. Run Automated Tests

Run the test suite:

```bash
pnpm run test:all
cargo test
```

### 4. Start the Dev Server

Start all three workers concurrently in development mode:

```bash
pnpm run dev
```

The services will be accessible locally:
- **Public Site**: `http://localhost:8788/`
- **Admin REST API**: `http://localhost:8787/api`
- **Admin UI Dashboard**: `http://localhost:3000/`

---

## Configuration & Environment Variables

Non-sensitive configuration is declared in each worker's `wrangler.toml` under `[vars]`:

```toml
[vars]
ENVIRONMENT = "production"
EDGE_TTL_SECONDS = "86400"
```

### Local Overrides (`.dev.vars`)
To override variables locally without modifying `wrangler.toml`, create a `.dev.vars` file in the package directory or root (ignored by git):

```ini
ENVIRONMENT=dev
EDGE_TTL_SECONDS=3600
```

### Environment Variables (`wrangler.toml` or `.dev.vars`)

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | No | `production` | Set to `dev` locally to bypass Cloudflare Access verification with a mocked admin user |
| `EDGE_TTL_SECONDS` | No | `86400` | Cloudflare edge cache duration (`s-maxage`) in seconds |
| `CANONICAL_ORIGIN` | No | Auto (strips `www.`) | Preferred primary origin (e.g. `https://example.com`) for canonicals, sitemap, and RSS |
| `CF_API_TOKEN` | No | — | Optional Cloudflare API token for global CDN cache purge on edits |
| `CF_ZONE_ID` | No | — | Optional Cloudflare Zone ID for global CDN cache purge on edits |

#### Canonical URL & Domain Normalization
When a site responds to both `www.` and apex domains (`https://www.example.com` and `https://example.com`), search engines treat them as competing duplicate websites.
- **Configured Origin**: If `CANONICAL_ORIGIN` (or `SITE_URL`) is defined in `wrangler.toml`, all canonical tags, Open Graph `og:url`, sitemaps, and RSS items strictly use that preferred domain.
- **Auto-Normalization**: If unset, Zygo automatically strips `www.` from the request origin, consolidating search authority onto the apex domain.
- **Syndication Override**: If an author fills in the **Canonical URL** field in the editor, that custom external URL (e.g. Medium or Substack) takes precedence.
- **Trailing Slash Conventions**: Following SEO best practices, the homepage canonical strictly retains a trailing slash (`{origin}/`), while post and page canonicals omit trailing slashes (`{origin}/post/:slug` and `{origin}/:slug`) to ensure consistent, non-duplicate URL indexation.

---

## Authentication & Cloudflare Access (Zero Trust)

Zygo CMS relies on [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/) (part of Cloudflare Zero Trust) to protect administrative endpoints and provide seamless, identity-aware access control for authors and administrators.

### 1. Zero Trust Architecture
- **Edge Identity Verification**: In production, Cloudflare Access guards `admin.<your-domain>` (the Admin UI) and `api.<your-domain>` (the Admin API). Unauthenticated requests are challenged with your configured identity provider (Google, GitHub, One-time PIN, etc.) before ever hitting worker code.
- **Cryptographic Assertion**: Cloudflare Access injects a signed JWT header (`Cf-Access-Jwt-Assertion`) into validated requests. The `admin-api-worker` decodes and verifies this assertion to identify the user.
- **Automated Role Provisioning**: When an authenticated user visits for the first time, Zygo CMS automatically records their identity in the D1 `users` table. The first user to log in is automatically granted the `admin` role; subsequent users receive the `author` role.
- **Frictionless Local Dev**: When `ENVIRONMENT = "dev"`, Cloudflare Access verification is automatically bypassed and mocked with a local administrator (`admin@localhost`), allowing offline and local development without needing an active internet connection or Access setup.

### 2. AI Agents & MCP Bridge
Zygo CMS supports AI agents (such as Claude Desktop or custom automated workflows) managing content via the Model Context Protocol (MCP):
- **MCP Bridge**: The local bridge package is located at `packages/zygo-mcp/index.mjs`.
- **Service Tokens**: When connecting external AI agents or CI/CD pipelines to a protected Cloudflare Access domain, generate a **Service Token** in the Cloudflare Zero Trust dashboard and include `CF-Access-Client-Id` and `CF-Access-Client-Secret` headers in automated requests.

---

## Deployment to Production

Zygo CMS is deployed across 3 decoupled Cloudflare Workers:
1. `public-worker`: Serves `example.com` and `www.example.com`
2. `admin-api-worker`: Serves `api.example.com`
3. `admin-ui`: Serves `admin.example.com`

For complete DNS and Cloudflare Custom Domain routing prerequisites, see the [Custom Domain & DNS Setup Guide](./docs/domain-and-dns-setup.md).

### Quick Start: Automated Setup Wizard (Recommended)

The fastest and most seamless way to onboard, configure custom domains, provision resources, and deploy Zygo CMS is with the interactive setup wizard:

```bash
pnpm run setup
```

The setup wizard handles the entire onboarding flow out of the box:
- Prompts for and validates your custom apex domain (e.g. `example.com`).
- Automatically detects your Cloudflare Account ID and prompts for a Cloudflare API Token.
- Provisions the Cloudflare D1 database (`zygo-cms-db`) and binds its UUID across your worker configs.
- Provisions the Cloudflare R2 media storage bucket (`zygo-cms-media`).
- Updates Custom Domain routes in `wrangler.toml` for `packages/public-worker`, `packages/admin-api-worker`, and `packages/admin-ui`.
- Applies remote D1 SQLite schema migrations automatically.
- Automates Cloudflare Access application and admin user policy setup via the Cloudflare REST API.
- Prompts to build and deploy all workers to Cloudflare immediately.

---

### Manual Deployment (CI/CD & Advanced)

If you prefer to configure resources manually or want to run steps within a CI/CD pipeline:

#### 1. Provision Cloudflare Resources

```bash
# Create D1 database
npx wrangler d1 create zygo-cms-db

# Create R2 storage bucket
npx wrangler r2 bucket create zygo-cms-media
```

#### 2. Update Database ID & Routes

Copy the generated `database_id` into `packages/public-worker/wrangler.toml` and `packages/admin-api-worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "zygo-cms-db"
database_id = "your-database-uuid"
migrations_dir = "../../migrations"
```

Configure your custom domain routes in each package's `wrangler.toml`.

#### 3. Apply Remote Migrations

Run database migrations against the production D1 database:

```bash
npx wrangler d1 migrations apply zygo-cms-db --remote -c packages/public-worker/wrangler.toml
```

#### 4. Build and Deploy All Workers

Compile the Rust WebAssembly binaries, build the Admin UI SPA, and deploy to Cloudflare:

```bash
# Build all 3 packages
pnpm run build

# Deploy all 3 workers
pnpm run deploy
```

You can also deploy individual workers:
```bash
pnpm run deploy:public   # packages/public-worker
pnpm run deploy:api      # packages/admin-api-worker
pnpm run deploy:ui       # packages/admin-ui
```

---

## Soft Deletion & Permanent Deletion

### Soft Deletion & Trash
When an entry is deleted via the CMS Dashboard or Editor (`DELETE /entries/:id`), Zygo CMS strictly performs a **soft delete** (`deleted_at = CURRENT_TIMESTAMP`):
- The entry is moved to the **Trash** tab in the Dashboard.
- Public routes immediately return 404 and edge caches are purged.
- All historical revisions in `entry_revisions` are fully preserved, allowing authors to inspect past versions and restore the page at any time.

### Manual Permanent Deletion (Direct SQL)
To prevent accidental data destruction, permanent deletion is intentionally disallowed via the application UI and API. If you need to permanently purge an entry and all its historical revisions, execute the following SQL commands via Wrangler:

```bash
# Delete associated revision history (replace <ENTRY_ID> with the entry id)
npx wrangler d1 execute zygo-cms-db --remote --command "DELETE FROM entry_revisions WHERE entry_id = <ENTRY_ID>;"

# Permanently delete the entry record
npx wrangler d1 execute zygo-cms-db --remote --command "DELETE FROM entries WHERE id = <ENTRY_ID>;"
```
*(Use `--local` instead of `--remote` for local development).*

