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
- **Secure Authentication**: Edge-level JWT/Bearer verification via **PropelAuth**.

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
├── Cargo.toml              # Rust crate dependencies and build configuration
├── wrangler.toml           # Cloudflare Worker, D1, R2, and asset bindings
├── migrations/             # D1 SQLite SQL migration scripts
│   ├── 0001_create_posts.sql
│   └── 0002_post_metadata.sql
├── templates/              # Askama HTML templates (Jinja/Twig syntax)
│   ├── base.html           # Shared layout shell and navigation
│   ├── index.html          # Public post list
│   ├── post.html           # Public post reader with SEO tags
│   └── editor.html         # TipTap rich text admin interface
├── public/                 # Static assets served directly at the edge
│   ├── style.css           # Minimalist typography & layout styles
│   ├── editor.css          # TipTap editor styling
│   └── editor.js           # TipTap initialization & media upload script
├── src/
│   ├── lib.rs              # Worker entrypoint and route handlers
│   ├── models.rs           # Data structs, validation, and unit tests
│   ├── db.rs               # D1 database queries and CRUD repository
│   ├── views.rs            # Askama template rendering for public views
│   ├── admin.rs            # Askama template rendering for editor UI
│   ├── auth.rs             # PropelAuth token verification & auth_required! macro
│   ├── media.rs            # R2 binary image upload and streaming
│   ├── error.rs            # AppError enum and HTTP response mapping
│   └── utils.rs            # Environment and config helpers
└── decisions/              # Design choices and future roadmap
```

---

## Local Development

### 1. Prerequisites

- [Rust](https://rustup.rs/) (stable toolchain)
- Node.js & npm (for Wrangler CLI)
- Cloudflare Wrangler:
  ```bash
  npm install -g wrangler
  ```
- Rust WebAssembly target and worker builder:
  ```bash
  rustup target add wasm32-unknown-unknown
  cargo install worker-build
  ```

### 2. Apply Local Migrations

Initialize the local D1 SQLite database:

```bash
npx wrangler d1 migrations apply zygo-cms-db --local
```

### 3. Run Automated Tests

Run the model and validation unit tests:

```bash
cargo test --lib
```

### 4. Start the Dev Server

Start the local Cloudflare Worker development environment:

```bash
npx wrangler dev
```

The application will be accessible at `http://localhost:8787`:
- **Public Blog Index**: `http://localhost:8787/`
- **Post Reader**: `http://localhost:8787/post/<slug>`
- **CMS Editor**: `http://localhost:8787/admin/editor`

---

## Configuration & Environment Variables

Non-sensitive configuration is declared in `wrangler.toml`:

```toml
[vars]
PROPELAUTH_AUTH_URL = "https://your-tenant.propelauth.com"
```

### Local Overrides (`.dev.vars`)
To override variables locally without modifying `wrangler.toml`, create a `.dev.vars` file in the root (ignored by git):

```ini
PROPELAUTH_AUTH_URL=https://your-dev-tenant.propelauthtest.com
```
### Environment Variables (`wrangler.toml` or `.dev.vars`)

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `PROPELAUTH_AUTH_URL` | Yes | — | PropelAuth authentication base URL |
| `EDGE_TTL_SECONDS` | No | `3600` | Cloudflare edge cache duration (`s-maxage`) in seconds |
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

## Authentication & AI Agents (PropelAuth)

Zygo CMS relies on [PropelAuth](https://www.propelauth.com/) to handle authentication for human editors and AI agents.

### 1. Set Up PropelAuth
1. Create a free account at PropelAuth.
2. In your PropelAuth dashboard, find your **Auth URL** and add it to `wrangler.toml` under `PROPELAUTH_AUTH_URL`.
3. Create a user account for yourself (or your marketing team) to access the Zygo CMS dashboard.

### 2. Enable AI Agent Access (API Keys)
Zygo CMS natively supports AI agents (like Claude Desktop or Zapier workflows) modifying content. This requires two types of keys: a **Server Key** (for your Cloudflare Worker) and **Personal API Keys** (for your users).

1. **Enable the Feature**: In your PropelAuth dashboard, navigate to **API Keys -> Personal API Keys** and enable the feature for your users.
2. **Create the Server Key (`PROPELAUTH_API_KEY`)**: 
   - Navigate to the **API Keys** section in your PropelAuth dashboard (often under Backend Integration).
   - Click **Create API Key** (name it e.g., "Zygo Cloudflare Worker"). 
   - *Note: These keys are environment-scoped. You do not need to check granular permission boxes; it acts as a master key for your server to validate user tokens.*
3. **Secure the Server Key**: Add this key to your Cloudflare Worker's encrypted vault:
   ```bash
   npx wrangler secret put PROPELAUTH_API_KEY
   ```
4. **End-User Generation**: Your non-technical users (e.g., marketers) can now log into the Zygo CMS dashboard, click the **API Keys** link in the header, and generate their own secure tokens to hand to their AI agents.

### 3. Using the AI MCP Bridge
To manage the CMS via Claude Desktop or other MCP-compatible AI agents, use the included local bridge. In your Claude Desktop config (`claude_desktop_config.json`), add:

```json
{
  "mcpServers": {
    "zygo_cms": {
      "command": "node",
      "args": ["/absolute/path/to/zygo/packages/zygo-mcp/index.mjs", "--url", "https://your-live-site.com", "--token", "PROPELAUTH_PERSONAL_API_KEY"]
    }
  }
}
```

---

## Deployment to Production

### 1. Create Production Resources

Create the live D1 database and R2 bucket in your Cloudflare account:

```bash
# 1. Create D1 database
npx wrangler d1 create zygo-cms-db

# 2. Create R2 storage bucket
npx wrangler r2 bucket create zygo-cms-media
```

### 2. Update `wrangler.toml`

Copy the `database_id` output from step 1 and update [`wrangler.toml`](./wrangler.toml):

```toml
[[d1_databases]]
binding = "DB"
database_name = "zygo-cms-db"
database_id = "your-database-id-from-step-1"
migrations_dir = "migrations"
```

### 3. Apply Remote Migrations

Run database migrations against the production D1 database:

```bash
npx wrangler d1 migrations apply zygo-cms-db --remote
```

### 4. Deploy the Worker

Compile the release Wasm binary, package static assets, and deploy to Cloudflare:

```bash
npx wrangler deploy
```

Once deployment completes, Wrangler will output your live URL:
`https://zygo-cms.<your-subdomain>.workers.dev`

