# create-zygo-app

The official CLI scaffolder for bootstrapping a clean, standalone **Zygo CMS** project powered by **Rust WebAssembly**, **Cloudflare Workers**, **Cloudflare D1**, and **Cloudflare R2**.

## Quick Start

```bash
npx create-zygo-app my-zygo-site
```

Or specify options non-interactively:

```bash
npx create-zygo-app my-zygo-site --yes
```

## What It Does

1. **Downloads Core Project**: Fetches the latest Zygo CMS starter files without git history.
2. **Sanitizes & Strips Internal Files**:
   - Removes internal planning & architectural records (`ROADMAP.md`, `CHANGELOG.md`, `docs/specs/`, `docs/audits/`), official documentation markdown & seeds (`docs/official/`, `scripts/seed_official_docs.mjs`), internal CI workflows (`.github/workflows/`), handoff notes, and the scaffolder package itself (`packages/create-zygo-app/`).
   - Cleans `wrangler.toml` files by removing hardcoded production routes (`zygodactylstudios.com`) and replacing the internal `database_id` with a clean placeholder (`00000000-0000-0000-0000-000000000000`).
   - Updates `package.json` with your project name.
3. **Configures Local Dev Environment**:
   - Creates `.dev.vars` (`ENVIRONMENT=dev`) and `.env.development` (`VITE_PUBLIC_SITE_URL=http://localhost:8788`) so local authentication bypass works out of the box.
4. **Bootstraps Workspace**:
   - Installs dependencies (`pnpm install`).
   - Builds the React Admin UI while using pre-compiled Rust Wasm workers (`pnpm run build`).
   - Applies local D1 SQLite migrations (`pnpm run db:migrate:local`).
   - Initializes a fresh Git repository (`git init`).

## CLI Flags

| Flag | Description |
| :--- | :--- |
| `<project-directory>` | Target directory name for the new Zygo CMS project |
| `--template-dir <path>` | Copy template from a local directory instead of GitHub |
| `--repo <owner/repo>` | Override source GitHub repository (default: `rjspencer/zygo-cms`) |
| `--branch <branch>` | Override source Git branch (default: `release`) |
| `--skip-install` | Skip running `pnpm install` |
| `--skip-build` | Skip building Wasm workers and Admin UI |
| `--skip-db` | Skip initializing local D1 migrations |
| `--skip-git` | Skip `git init` |
| `-y, --yes` | Run non-interactively using defaults |
| `-h, --help` | Display usage help |
