# CLI & Deployment Cheat-Sheet

This cheat-sheet provides a fast reference for Zygo CMS scripts, cross-platform diagnostic commands, secret management, and direct Wrangler operations.

---

## 1. Common Zygo Scripts

All core lifecycle commands are executed from the repository root via `pnpm`:

| Command | Description | Ports / Targets |
| :--- | :--- | :--- |
| `pnpm run dev` | Boots all three local services concurrently | API `:8787`, Public `:8788`, UI `:5173` |
| `pnpm run build` | Smart build runner (auto-detects pre-built Wasm; compiles Rust if available/needed) | `packages/*` |
| `pnpm run build:rust` | Compiles all Rust WebAssembly workers and template-wasm | `packages/*-worker`, `template-wasm` |
| `pnpm run build:wasm` | Compiles template-wasm with wasm-pack | `packages/template-wasm/pkg` |
| `pnpm run db:migrate:local` | Applies all D1 SQLite migrations to local `.wrangler/state` | Local SQLite state |
| `pnpm run db:migrate` | Applies all D1 SQLite migrations to remote Cloudflare D1 | Remote D1 database |
| `pnpm run db:reset` | Wipes and re-initializes the local SQLite database schema | Local `.wrangler/state` |
| `pnpm run db:reset:remote` | Wipes and re-initializes the remote production D1 schema | Remote D1 database |
| `pnpm run setup` / `pnpm run wizard` | Runs interactive setup wizard for D1, R2, Zero Trust, and workers | Interactive CLI |
| `pnpm run deploy` | Deploys public worker, admin API worker, and admin UI | Cloudflare Edge |
| `pnpm run seed:docs:official` | Parses official markdown docs and seeds them into D1 | D1 `entries` table |
| `pnpm run seed:theme-preview` | Seeds default themes and section templates into D1 | D1 `templates` table |
| `pnpm run test:all` | Runs the full Vitest suite across workers, UI, and E2E | Node / Vitest |
| `cargo test` | Runs native Rust unit and integration test suites | Rust / Cargo |

### Build Script Flags & Advanced Options
When invoking the build runner via Node, specific flags can control Rust compilation behavior:

| Invocation | Behavior |
| :--- | :--- |
| `node scripts/build.mjs --force-rust` | Force recompilation of Rust workers and `template-wasm` before building UI |
| `node scripts/build.mjs --skip-rust` | Force skip Rust recompilation and proceed directly to UI build |
| `node scripts/build.mjs` | Default smart mode: auto-detects pre-built Wasm; compiles Rust only if needed and toolchain is installed |

For detailed documentation on the pre-compiled WebAssembly distribution model, see the [Pre-Built Wasm Distribution Guide](./wasm-distribution.md).

---

## 2. Cross-Platform Commands Matrix

Diagnostic and maintenance operations mapped across macOS, Linux, Windows WSL2, and Windows Native PowerShell:

| Task / Operation | macOS (Zsh / Terminal) | Linux (Ubuntu / Bash) | Windows 11 (WSL2 Ubuntu) | Windows 11 (Native PowerShell) |
| :--- | :--- | :--- | :--- | :--- |
| **Compiler / Toolchain** | `xcode-select --install` | `sudo apt install build-essential pkg-config libssl-dev` | Same as Linux (`build-essential`) | Visual Studio Build Tools (C++ Workload) via `winget` |
| **Node.js LTS (v22)** | `brew install node@22` | NodeSource repo (`setup_22.x`) | NodeSource repo (`setup_22.x`) | `winget install OpenJS.NodeJS.LTS` |
| **Package Manager (pnpm 11)** | `brew install pnpm` | `corepack enable && corepack prepare pnpm@11 --activate` | `corepack enable && corepack prepare pnpm@11 --activate` | `corepack enable; corepack prepare pnpm@11 --activate` |
| **Rust & Wasm Target** | `rustup target add wasm32-unknown-unknown` | `rustup target add wasm32-unknown-unknown` | `rustup target add wasm32-unknown-unknown` | `rustup target add wasm32-unknown-unknown` |
| **Worker Builder** | `cargo install worker-build` | `cargo install worker-build` | `cargo install worker-build` | `cargo install worker-build` |
| **DNS Resolution Check** | `dig +short example.com` | `dig +short example.com` | `dig +short example.com` | `Resolve-DnsName example.com` |
| **HTTP Response Check** | `curl -I https://example.com` | `curl -I https://example.com` | `curl -I https://example.com` | `curl.exe -I https://example.com` |
| **Port Conflict Check** | `lsof -i :8787` | `ss -tulpn \| grep :8787` | `ss -tulpn \| grep :8787` | `netstat -ano \| findstr 8787` |
| **Killing Stuck Process** | `kill -9 <PID>` | `kill -9 <PID>` | `kill -9 <PID>` | `Stop-Process -Id <PID> -Force` |
| **Wrangler Headless Login** | `npx wrangler login` | `npx wrangler login` | `npx wrangler login --browser=false` | `npx wrangler login` |

---

## 3. Secret Management Commands

Zygo CMS requires Cloudflare API secrets for cache purging and edge synchronization. Worker secrets are encrypted and stored directly on Cloudflare Workers.

### Setting Secrets in Production
Set the cache-purge API token (`CF_API_TOKEN`) on both workers:

```bash
# Admin API Worker (purges cache on publish/update)
npx wrangler secret put CF_API_TOKEN -c packages/admin-api-worker/wrangler.toml

# Public Worker (handles edge revalidation)
npx wrangler secret put CF_API_TOKEN -c packages/public-worker/wrangler.toml
```

### Local Development Secrets (`.dev.vars`)
For local execution, Wrangler reads secrets from `.dev.vars` inside each package directory:

```ini
# packages/admin-api-worker/.dev.vars
ENVIRONMENT=dev
CF_API_TOKEN=mock-local-token
CF_ZONE_ID=mock-zone-id
```

```ini
# packages/public-worker/.dev.vars
ENVIRONMENT=dev
CF_ZONE_ID=mock-zone-id
```

---

## 4. Direct Wrangler Operations

Direct Wrangler CLI commands for database inspection, log tailing, and troubleshooting:

### Inspecting Local SQLite Database
```bash
# Query local entries table
npx wrangler d1 execute zygo-cms-db --local \
  -c packages/admin-api-worker/wrangler.toml \
  --persist-to=./.wrangler/state \
  --command "SELECT id, slug, title, status FROM entries LIMIT 5;"
```

### Inspecting Remote Production D1 Database
```bash
# Query remote production entries table
npx wrangler d1 execute zygo-cms-db --remote \
  -c packages/admin-api-worker/wrangler.toml \
  --command "SELECT id, slug, title, status FROM entries LIMIT 5;"
```

### Exporting and Backing Up D1 Database
```bash
# Export remote database to SQL file
npx wrangler d1 export zygo-cms-db --remote \
  -c packages/admin-api-worker/wrangler.toml \
  --output="./backup-$(date +%Y%m%d).sql"
```

### Tailing Live Edge Worker Logs
Stream real-time `console.log` and `console_error` events from production workers:

```bash
# Tail Public SSR Worker
npx wrangler tail -c packages/public-worker/wrangler.toml

# Tail Admin API Worker
npx wrangler tail -c packages/admin-api-worker/wrangler.toml
```

---

## 5. Configuration Variables Reference

| Variable | Location | Type | Purpose |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | `.dev.vars` / `wrangler.toml` | Var | Set to `dev` for local mock auth (`admin@localhost`), `production` for Access enforcement |
| `CF_ACCESS_AUD` | `packages/admin-api-worker/wrangler.toml` | Var | 64-character Application Audience tag for Cloudflare Access JWT validation |
| `CF_ACCESS_TEAM_DOMAIN` | `packages/admin-api-worker/wrangler.toml` | Var | Zero Trust team domain (e.g. `<team>.cloudflareaccess.com`) |
| `CF_ZONE_ID` | `packages/*/wrangler.toml` | Var | Cloudflare Zone ID for the apex domain (used for cache purge API calls) |
| `CF_API_TOKEN` | Worker Secret (`wrangler secret put`) | Secret | Cloudflare API token with `Zone.Cache Purge` permissions |
| `SITE_URL` | `packages/public-worker/wrangler.toml` | Var | Fully qualified canonical site URL (e.g., `https://example.com`) |
| `VITE_API_BASE_URL` | `packages/admin-ui/.env` | Var | API base URL for Admin UI fetch calls (defaults to `/api` or custom subdomain) |
