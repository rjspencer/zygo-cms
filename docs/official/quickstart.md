# Quickstart

Get up and running with Zygo CMS on your local machine in minutes. This guide walks you through the prerequisites, installation, local database setup, and booting up the development environment.

## Prerequisites

Before you begin, ensure your development environment is properly configured with the following tools:

- **[Node.js](https://nodejs.org/)** (v18 or higher): The JavaScript runtime used for our frontend tooling and scripts.
- **[pnpm](https://pnpm.io/)**: Our preferred package manager. It is fast and disk-space efficient.
- **[Rust & Cargo](https://rustup.rs/)**: Required for compiling the Cloudflare Workers backend, which is written in Rust using `worker-rs`.
- **[Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)**: Cloudflare's official CLI for managing and deploying Workers and D1 databases.

## 1. Installation

Bootstrap a new project using our CLI tool. This command will scaffold a new directory with the complete Zygo CMS structure.

```bash
npx create-zygo-app my-new-site
cd my-new-site
pnpm install
```

*Note: If you are contributing directly to the Zygo CMS repository, you can simply clone the repo and run `pnpm install` instead.*

## 2. Local Database Setup

Zygo CMS relies on Cloudflare D1 for its database. For local development, Wrangler provides a local SQLite environment that mimics D1. Before starting the server, you must initialize the local database schema by applying the migrations:

```bash
pnpm run db:migrate:local
```

This applies migrations to the local D1 SQLite database, passing `--persist-to=./.wrangler/state` so all workers access a consistent local database state.

## 3. Start the Development Server

Boot up the backend workers and frontend Admin UI simultaneously using the provided development script:

```bash
pnpm run dev
```

### Understanding the Startup Flow

The `dev` script utilizes the `concurrently` package to orchestrate multiple processes within a single terminal window. This ensures all pieces of the architecture are running in sync:

1. **Admin API Worker (Rust REST API)**: Serves the authenticated REST endpoints on port `8787` (`http://localhost:8787`).
2. **Public Website Worker (Rust + MiniJinja SSR)**: Renders and serves the public-facing website and MiniJinja templates on port `8788` (`http://localhost:8788`).
3. **Admin UI (Vite / React 19 SPA)**: Serves the administrative dashboard frontend on port `5173` (`http://localhost:5173`) and proxies `/api` requests to the Admin API worker (`:8787`).

```mermaid
flowchart TD
    A["pnpm run dev"] --> B{"concurrently"}
    B --> C["Admin API Worker (Rust REST API)"]
    B --> D["Public Worker (Rust + MiniJinja SSR)"]
    B --> E["Admin UI (Vite / React 19 SPA)"]
    
    C -.->|serves on :8787| F[Local Machine]
    D -.->|serves on :8788| F
    E -.->|serves on :5173 / proxies /api to :8787| F
```

## 4. First Steps

Once the terminal output stabilizes and indicates all servers are running:

1. Open **[http://localhost:5173](http://localhost:5173)** in your web browser.
2. Zygo CMS is **100% passwordless** — there are no passwords or manual registration screens to configure. When running in development mode (`ENVIRONMENT=dev` in `packages/admin-api-worker/.dev.vars` or project root), the Admin API automatically bypasses Cloudflare Access and authenticates the user as `admin@localhost` with full admin privileges, so no registration or password is required. (In production, authentication is handled cryptographically at the edge via Cloudflare Access Zero Trust).
3. Once the dashboard loads, navigate to **Content -> Entries** in the sidebar to start creating and editing content!
4. View your public-facing rendered site at **[http://localhost:8788](http://localhost:8788)**.

## Troubleshooting

If you run into issues during the quickstart process, consider these common solutions:

- **Address in Use (Port Conflict)**: If you see an error about `EADDRINUSE`, ensure ports `8787`, `8788`, and `5173` are not occupied by other applications. You can terminate orphaned Wrangler processes or modify the dev script ports if necessary.
- **Database Errors (No Such Table)**: If the Admin UI throws a "table not found" or 500 error on your first visit, verify that you successfully ran `pnpm run db:migrate:local`.
- **Rust Compilation Failures**: If Cargo fails to build the workers, ensure your Rust toolchain is up-to-date by running `rustup update`. Additionally, verify that `worker-build` is installed (`cargo install worker-build`) and target `wasm32-unknown-unknown` is added.
