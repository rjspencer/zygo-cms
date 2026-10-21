# Setup Docs Review (new-user walkthrough)

Scope: [README.md](../../../README.md) → [quickstart](../../official/quickstart.md) → [deployment](../../official/deployment.md) → [introduction](../../official/introduction.md) / [concepts](../../official/concepts.md) / [advanced](../../official/advanced.md) / [examples](../../official/examples.md) → [domain-and-dns-setup](../../domain-and-dns-setup.md). Verified against [scripts/setup.mjs](../../../scripts/setup.mjs), [package.json](../../../package.json), the `wrangler.toml` files, `.github/workflows/deploy.yml`, and `packages/create-zygo-app/index.mjs`.

Verification Status: All official docs (`concepts.md`, `examples.md`, `advanced.md`, `introduction.md`, `quickstart.md`, `deployment.md`) and setup guides have been fully verified line-by-line against actual repository code, models, SQL migrations, worker route handlers, and scripts.

## Issues

| # | Sev | Location | Problem | Suggested fix |
|---|-----|----------|---------|---------------|
| 1 | blocker | [quickstart.md](../../official/quickstart.md) "Starting the app"/first-login section; [README](../../../README.md) | Quickstart says the first visit prompts you to "create the initial administrative user profile… set your email and password". No password flow exists (no `password` handling in admin-api-worker). Local auth is the `ENVIRONMENT=dev` mock user `admin@localhost`. It also links to `localhost:8788/admin`, but the admin UI is on `:3000` or `:5173`. | Rewrite: open the admin UI URL, you are auto-logged-in as `admin@localhost`. Explain that the dev bypass depends on `ENVIRONMENT=dev` in `.dev.vars`. |
| 2 | blocker | [quickstart.md](../../official/quickstart.md) step 1–2 | Local migration command has no `--persist-to=./.wrangler/state`, but `dev:api` and `dev:public` read `./.wrangler/state` (see [package.json](../../../package.json)). Following the quickstart literally gives "no such table" at runtime. The Troubleshooting section blames the user instead. | Use `pnpm run db:migrate:local` everywhere, as README does. |
| 3 | blocker | [quickstart.md](../../official/quickstart.md) step 1 | `npx create-zygo-app` already runs `pnpm install`, builds, and creates `.dev.vars` and the local DB (per README). The quickstart then says to run `pnpm install` and migrate again, and never mentions that a Rust build happens (first build takes many minutes). | Make quickstart = `npx create-zygo-app … && cd … && pnpm run dev`. Document each step the scaffolder performs and its duration. Note `--skip-build` if that flag exists. |
| 4 | blocker | [domain-and-dns-setup.md §5](../../domain-and-dns-setup.md), [deployment.md](../../official/deployment.md) | `curl -I https://api.example.com/api/health` is documented. I found no `health` route in `packages/admin-api-worker/src` or `packages/public-worker/src`. | Verify the route. If it doesn't exist, point at a real endpoint, or add the route (a code change, not a docs change). |
| 5 | blocker | [domain-and-dns-setup.md §3,5](../../domain-and-dns-setup.md), [README](../../../README.md) Manual flow | The domain guide tells users to hand-edit `wrangler.toml` and push to `main` for GitHub Actions. This ignores `pnpm run setup`, which does it automatically. A scaffolded project has `.github` stripped (`STRIP_PATHS`), so the GitHub Actions path (`deploy.yml`) doesn't exist for `create-zygo-app` users. The doc also never says which path is for whom. | Add a decision box at the top: "Scaffolded project → `pnpm run setup`. Contributor monorepo clone → GitHub Actions." Move the CI sections under "Advanced". |
| 6 | blocker | [deployment.md §1](../../official/deployment.md) vs [README](../../../README.md) vs [setup.mjs](../../../scripts/setup.mjs) | The docs contradict each other on `CF_ZONE_ID`/`CF_API_TOKEN`. deployment.md says to add them to `.dev.vars` and Worker secrets by hand. README says they are optional. setup.mjs writes `CF_ZONE_ID` into `admin-api-worker/wrangler.toml` `[vars]` (line ~775). The CI step passes `CF_API_TOKEN`. No doc says where the token is stored at runtime or the `wrangler secret put CF_API_TOKEN` command. | Single source of truth: a "Secrets & vars" table (name, where set, set by setup.mjs?, how to set manually, e.g. `npx wrangler secret put CF_API_TOKEN -c packages/admin-api-worker/wrangler.toml`). |
| 7 | major | [deployment.md §1–2](../../official/deployment.md) | Order is wrong or ambiguous. The Zone ID and a cache-purge token are required "before you begin", but setup.mjs asks for a different, broader token (Access/DNS/routes/Workers/D1/R2). Neither the DNS guide's token table nor deployment.md lists D1:Edit or R2:Edit, and setup.mjs creates D1 and R2 via `wrangler`. Also missing: `Zone: Cache Purge: Purge` and `Account Settings: Read` for `whoami`. | One consolidated token table. Say whether setup.mjs consumes `CLOUDFLARE_API_TOKEN`/`CF_API_TOKEN` env vars (line ~918) or prompts for it. Say which permission names Cloudflare actually shows ("Cache Purge: Purge", not "Edit"). |
| 8 | major | [deployment.md §2](../../official/deployment.md) | Claims the script will "Configure Buckets / KV" and "inject … service tokens". setup.mjs does R2 only, no KV, and I found no service-token provisioning. It also calls the two-worker setup "decoupled, two-worker", but there are three workers (admin-ui as well). | Correct wording to three workers, R2, Access apps. |
| 9 | major | [introduction.md](../../official/introduction.md), [README](../../../README.md) | Stale or contradictory tech claims. Introduction says public-worker renders with "Minijinja"; README says Askama, and public-worker `Cargo.toml` has `minijinja`. README says "Vanilla JS + TipTap" frontend, but admin-ui is React 19 (stated elsewhere in the same README). README says "Rust Edition 2024". Introduction says "two-worker architecture", while wrangler.toml and the DNS guide say three. | Reconcile: pick the real template engine, fix the frontend line, rename the section to "Three-Worker (two backend + one UI)". |
| 10 | major | [quickstart.md](../../official/quickstart.md) | Wrong or inconsistent ports. Prose says troubleshooting ports `8787/8788/5173`. README says the UI is at `:3000`. vite.config uses `5173`. Quickstart mermaid says `:5173`. Also: broken Wrangler link `developers.cloudflarecom` (missing dot); "GraphQL/REST endpoints" (there is no GraphQL); Troubleshooting mentions `wasm-pack` while the README prerequisites say `worker-build`; the CI builds `template-wasm` via wasm-pack, and no doc mentions this package. | Confirm the real UI port and use it everywhere. Fix the link. Remove "GraphQL". |
| 11 | major | [README](../../../README.md) / [quickstart](../../official/quickstart.md) prerequisites | Prerequisite version mismatches. Quickstart: Node v18+. package.json `engines`: pnpm `>11.0.0`. CI uses Node 22 and pnpm 11. No Rust version, no mention of `wasm-pack` / template-wasm, no minimum Wrangler version. README installs Wrangler globally (`pnpm add -g wrangler`) but all scripts use `wrangler` from the local bin. No C toolchain mentioned (needed for some crates; Xcode CLT on macOS, build-essential on Ubuntu, MSVC Build Tools on Windows). | Single prerequisites table with versions and per-OS install commands (see OS section). Say Node 22 and pnpm 11. |
| 12 | major | [README](../../../README.md) | The README is a poor first page for a new user. It leads with features and tech stack, then three overlapping setup flows: create-zygo-app, local dev, "Automated Setup Wizard", and "Manual Deployment". The "Quick Start" appears twice. It never mentions needing a Cloudflare account, a domain on Cloudflare, or the Access/Zero Trust free plan. | Add a top "Path" section (Try locally / Deploy to production) with prerequisites for each. Link to quickstart and deployment instead of duplicating content. |
| 13 | major | Whole docs set | Duplication. D1/R2 creation, migrations, build and deploy steps appear in README, deployment.md, domain-and-dns-setup.md and `wrangler.toml` header comments. They are slightly inconsistent: deployment.md says "run migrations before deploying", the README manual flow says the same, and `deploy.yml` does it after build. | Keep one canonical procedure (deployment.md). The others should link to it. |
| 14 | major | [deployment.md §2](../../official/deployment.md) and [DNS guide](../../domain-and-dns-setup.md) | `pnpm run setup` is never described step by step. There is no sample of the prompts (domain, email, Zero Trust team name, Google IdP, bot/AI-crawl settings, deploy now?), and no explanation of what happens if the zone isn't on Cloudflare yet or the Zero Trust org doesn't exist. setup.mjs line ~455–464 tells users to "re-run `pnpm run setup`" after fixing a token. Deployment.md uses `node scripts/setup.mjs`, README uses `pnpm run setup`. | Document the prompts, expected outcomes and re-runnability. Use the `pnpm run setup` form everywhere. |
| 15 | major | Access / Zero Trust (README, advanced.md, DNS guide) | Jargon with no definitions: Zero Trust, Access application, AUD tag, team domain, IdP, One-time PIN, Service Token, zone, custom domain vs route, D1, R2, Wasm. Zero Trust requires a payment method on file even for the free plan, and the doc never says so. `CF_ACCESS_AUD` / `CF_ACCESS_TEAM_DOMAIN` appear in `wrangler.toml` but are not in the README env-vars table. | Add a short glossary and prerequisites note: free Zero Trust plan needs a card, 50 seats free. Add the two vars to the table, with "set by setup.mjs". |
| 16 | major | [deployment.md](../../official/deployment.md), README | No cost section. Workers Paid (\$5/mo) is likely required, because Rust/Wasm bundles can exceed the free 3 MiB limit. D1/R2 free tiers, Zero Trust free tier, and the domain cost are all unmentioned. Introduction says only "reasonable cost". | Add a "What this costs" table. Verify Wasm bundle size against the plan limit before asserting it. |
| 17 | major | All docs | No teardown / uninstall. A user who tests the product leaves behind 3 workers, D1 `zygo-cms-db`, R2 `zygo-cms-media`, Access apps, DNS records and an API token. | Add "Remove everything": `npx wrangler delete -c …` ×3, `npx wrangler d1 delete zygo-cms-db`, `npx wrangler r2 bucket delete zygo-cms-media` (after emptying it), delete the Access apps, revoke the token. |
| 18 | major | All docs | Troubleshooting is thin (quickstart has 3 items, DNS guide covers one error). Missing: `wrangler login` failures or a headless machine; `cargo install worker-build` failing on Windows or without a C linker; wasm32 target missing; D1 "database not found"; custom-domain 522/525 or SSL pending; Access redirect loops (`CF_ACCESS_TEAM_DOMAIN` mismatch, noted in setup.mjs line ~199); Error 1010 token forbidden (setup.mjs handles it but docs don't). | Add a troubleshooting table keyed by the exact error text. |
| 19 | major | [deployment.md](../../official/deployment.md) §4 and [README](../../../README.md) | `pnpm run deploy` depends on `build/index.js` existing. The deploy order (public → api → ui) hides that the Access `CF_ACCESS_AUD` must be set before first deploy, or auth fails. The docs say run the tests (`pnpm run test:all`, `cargo test`) before deploying, which takes a long time for a new user and may require a browser. | Mark tests as optional for end users. Clarify the order: setup → migrate → build → deploy. |
| 20 | major | [deployment.md](../../official/deployment.md) vs [DNS guide](../../domain-and-dns-setup.md) | Duplicated and contradictory manual steps. DNS guide: delete existing A/AAAA/CNAME records first. Deployment guide never mentions this and recommends the script. It also fails to say that the apex domain must exist as a zone on this Cloudflare account (not just registered elsewhere). | Move DNS prerequisites into deployment.md as a pre-deploy checklist. |
| 21 | minor | [wrangler.toml](../../../wrangler.toml) header, `.env.example` | Root `wrangler.toml` contains only comments plus the maintainer's real D1 UUID and `zygodactylstudios.com` domain. `.env.example` uses `CF_BUILD_TOKEN`/`PUBLIC_KEY`, which are not in any doc and do not match `CLOUDFLARE_API_TOKEN` in CI. Header says `npm run dev`, project uses pnpm. | Clean up or document. Standardize on `pnpm`. |
| 22 | minor | [README](../../../README.md) | Project tree lists `create-zygo-app` but not `template-wasm`, `public/`, `tests/`. README says `docs/official` is "end-user guides" but those are stripped from scaffolds, so the new user cannot find them offline. | Link to the hosted docs. |
| 23 | minor | [DNS guide](../../domain-and-dns-setup.md) §5 | `dig` is not installed on Windows. No expected output sample is shown. `curl -I` on `admin.example.com` will return a 302 to Access, not 200, and a user may think it failed. | Add Windows equivalents. Say "expect 302 → `<team>.cloudflareaccess.com`". |
| 24 | minor | [advanced.md](../../official/advanced.md), [README](../../../README.md) | `CANONICAL_ORIGIN`/`SITE_URL` are mentioned, but only `CANONICAL_ORIGIN` is in the table. Service-token headers are described but not how to create one. `pnpm run setup` is "Recommended" but then there is a "manual" mode with no mention that setup.mjs is safe to re-run. | Minor clarifications. |
| 25 | minor | All docs | No "next steps" after deployment. After a successful deploy a user doesn't know how to invite more users, add a theme, edit the nav, back up D1, or update Zygo (how do scaffolded projects pull upstream changes?). | Add a "What next" section: first login, adding authors (Access policy), backups (`wrangler d1 export`), upgrading. |
| 26 | minor | [advanced.md](../../official/advanced.md), [README](../../../README.md) | Permanent deletion example uses `--command "DELETE …"` with double quotes: fine in bash/zsh/PowerShell, but `<ENTRY_ID>` placeholder syntax would be interpreted as redirection in `cmd.exe`/bash if the user pastes it unreplaced. | Use `ENTRY_ID` without angle brackets. |
| 27 | blocker | [concepts.md § Data Model Overview](../../official/concepts.md) | The Mermaid ER diagram describes an obsolete or fabricated schema: `USERS` has a `username` column (actual `users` table uses `auth_provider_id`, `email`, `display_name`, `role`, no `username`); `ENTRIES` has `entry_type` and `content` (actual schema has `type` and `body_html` / `body_json`); and it models `TAXONOMY` (`id, name, slug, tax_type`) and `ENTRY_TAXONOMY` (`entry_id, taxonomy_id`) as relational join tables. In reality (`0001_initial_schema.sql`), no taxonomy tables exist—categories and tags are stored as delimited text columns (`category TEXT`, `tags TEXT`) directly on the `entries` table. | Replace the ER diagram with the actual D1 relational schema representing `users`, `entries`, `entry_revisions`, `media`, `menus`, `settings`, `section_templates`, `layout_templates`, and `redirects`. |
| 28 | blocker | [concepts.md § Content Types & Schema Builder](../../official/concepts.md) | Claims users can "Navigate to Settings -> Content Types", define reusable fields (Text, Number, Date, Image, Boolean), and have the Editor Sidebar dynamically render form inputs persisting to `custom_fields_json`. In reality, there is no "Content Types" page or settings tab in `admin-ui` (the `/content-types` route was aliased to `/section-templates` in `admin-api-worker`), and the Editor does not have dynamic schema field rendering for custom fields. | Rewrite the section to describe Section Templates and Layout Templates (which live under `/templates`), and clarify that custom post schemas/fields are handled via section templates or structured JSON. |
| 29 | blocker | [examples.md § Recipe 3: Customizing the Theme](../../official/examples.md) | Directs users to "Open `src/views.rs`" (which does not exist at root; it is `packages/public-worker/src/views.rs`) and provides code snippets featuring `pub const POST_TEMPLATE: &str` and `pub fn render_post(env: &Environment, post_data: &serde_json::Value) -> String`. Neither this constant nor this function signature exists (`render_post` in `views.rs` accepts 7 parameters and returns `worker::Result<String>`). More critically, instructing users to modify and recompile Rust source code contradicts Zygo's architecture where templates and CSS are edited live via the Admin UI `/theme` and `/templates` editors. | Rewrite Recipe 3 to document customizing themes and layout templates via the Admin UI (`/theme` and `/templates`) and public CSS variables; move Rust-level template customization to a developer-focused section with accurate function signatures. |
| 30 | blocker | [examples.md § Recipe 4: Going Headless (API Usage)](../../official/examples.md) | Recommends querying `/api/entries?type=post&limit=1` and shows a response payload of `{ "status": "success", "data": [{ "id": "entry_01HVK...", ... }], "meta": { ... } }`. In reality: (1) `/api/entries` requires Cloudflare Access authentication (`auth_required!`), returning 401/302 to unauthorized headless frontends; (2) it does not support `?type` or `?limit` query parameters (it only parses `?filter=trash`); (3) the API returns a raw JSON array `[...]`, not a wrapped object with `status`, `data`, and `meta`; and (4) entry IDs are auto-incrementing integers, not KSUID strings. | Document how to authenticate headless clients using Cloudflare Access Service Tokens (`CF-Access-Client-Id` / `CF-Access-Client-Secret`), provide the actual `/api/entries` and `/api/posts` endpoints and response schemas, or document the public feeds (`/rss.xml`, `/feed.xml`, `/sitemap.xml`). |
| 31 | major | [concepts.md § Media Library](../../official/concepts.md) | Claims "Media is primarily stored and served via Cloudflare R2... (D1 storage is available for smaller, text-heavy setups)". In reality, binary media files are stored exclusively in Cloudflare R2 (`packages/admin-api-worker/src/media.rs`). D1 is only used to store media metadata (`media` table: `key, filename, mime_type, size_bytes`). There is no option or code path to store binary media in D1. | Correct the description to state that all binary media is stored in R2, while metadata and search indexing reside in D1. |
| 32 | major | [concepts.md § Posts vs. Pages](../../official/concepts.md) | Claims that Posts are "Automatically routed with a customizable prefix, e.g., `/post/my-article-slug`". In reality, `/post/:slug` and `/posts` are hardcoded in `packages/public-worker/src/lib.rs` and cannot be customized via configuration. It also claims Pages use "the block-based Section Templates engine, allowing for drag-and-drop structural design". In reality, the editor uses explicit Move Up / Move Down buttons (`CaretUpIcon`, `CaretDownIcon`), not drag-and-drop. | State that `/post/:slug` is the default routing structure, and update the UI description to reflect the card-based Move Up / Move Down section controls. |
| 33 | major | [examples.md § Recipe 2: Building a Landing Page](../../official/examples.md) | Instructs users to "Go to Settings -> Section Templates, or define your schema directly: `{ "id": "hero_section", "name": "Hero", "fields": [{ "type": "string" }] }`" and use the "Block Builder". Section templates are located at `/templates` (nav item "Templates"), not in Settings. The JSON schema format is invalid (requires `schema_json` serialized string, field types are `text`, `textarea`, `richtext`, `url`, etc., not `string`, and requires `template_html` and `template_css`). | Update the navigation path to `/templates`, provide a valid SectionTemplate JSON payload structure matching `packages/core/src/models/section_template.rs`, and describe the Section Card editor. |
| 34 | major | [advanced.md § Writing Custom Rust Logic](../../official/advanced.md) | Claims "the workers (Admin and Site) are in `apps/`", routes are in `src/handlers/`, and discusses maintaining compatibility "between the two workers". There is no `apps/` directory in the repository (workers are in `packages/admin-api-worker` and `packages/public-worker`), and Zygo has three workers (admin-api-worker, public-worker, admin-ui). | Update directory paths to `packages/admin-api-worker` and `packages/public-worker`, and refer to the three-worker architecture. |
| 35 | major | [advanced.md § Level 1 - DOM & Template Testing](../../official/advanced.md) | Claims tests verify "server-side rendered Askama templates" and instructs developers to "Always load the real Askama template from `templates/` via `fs.readFileSync`". There are no Askama templates and no `templates/` directory anywhere in the repository. Templates are rendered with `minijinja` using embedded defaults in `views.rs` and D1 database rows. | Remove references to Askama and the fictional `templates/` directory; document how `vitest` tests public-worker output and admin-ui React components. |

## OS coverage audit

Findings:

- macOS: implicit. Nothing is called out, and no `brew` commands are given.
- Linux (Ubuntu): not mentioned anywhere (no apt packages, no `build-essential`).
- Windows 11: not mentioned anywhere. Known breakers in the code:
  - `dev:public` uses `sleep 3 && …` ([package.json](../../../package.json)). `sleep` doesn't exist in cmd.exe or PowerShell, so `pnpm run dev` fails on Windows. This needs a code fix (for example `node -e "setTimeout(()=>{},3000)"` or the `wait-on` package) or a documented WSL requirement.
  - Docs use `cd a && b`, `rm`, `dig`, `curl -I`, and bash line-continuation styles.
  - `update_*.sh` scripts in the repo root are bash only.
  - `cargo install worker-build` and linking need the MSVC Build Tools.
  - `scripts/setup.mjs` uses `execSync('npx …')`. This works on Windows (`npx.cmd` resolution under a shell), but I have not tested it.
- The whole path is untested on Windows. The recommended approach is WSL2 (Ubuntu) as the primary supported route for Windows 11, with native PowerShell noted as untested unless the `sleep` bug is fixed.

### Draft: "Install prerequisites" section (proposal for quickstart.md)

````markdown
## Install prerequisites

You need: Node.js 22 (LTS), pnpm 11, Rust (stable) with the `wasm32-unknown-unknown` target, `worker-build`, and a C toolchain.
Wrangler is installed per-project by `pnpm install`; you don't need a global install.

### macOS
```bash
xcode-select --install                              # compiler/linker
brew install node@22 pnpm
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup target add wasm32-unknown-unknown
cargo install worker-build
```

### Linux (Ubuntu 22.04 / 24.04)
```bash
sudo apt update && sudo apt install -y build-essential curl git pkg-config libssl-dev
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
corepack enable && corepack prepare pnpm@11 --activate   # or: npm i -g pnpm@11
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup target add wasm32-unknown-unknown
cargo install worker-build
```

### Windows 11 (recommended: WSL2 + Ubuntu)
Zygo's scripts assume a POSIX shell (`sleep`, `&&`). Use WSL2:
```powershell
wsl --install -d Ubuntu-24.04     # reboot, then open "Ubuntu" from the Start menu
```
Then follow the **Linux (Ubuntu)** steps inside Ubuntu. Keep the project inside the Linux
filesystem (`~/code/...`), not `/mnt/c/...`, for speed and file-watch reliability.
`wrangler login` opens a browser on the Windows side; if it can't, run `npx wrangler login --browser=false`
or use an API token via `CLOUDFLARE_API_TOKEN`.

### Windows 11 (native PowerShell, untested, needs the `sleep` fix first)
```powershell
winget install OpenJS.NodeJS.LTS
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
winget install Rustlang.Rustup
corepack enable; corepack prepare pnpm@11 --activate
rustup target add wasm32-unknown-unknown
cargo install worker-build
```
````

### Draft: "Verify DNS and the site" cross-platform snippet (proposal for domain-and-dns-setup.md §5.3)

````markdown
| Check | macOS / Linux / WSL | Windows PowerShell |
|---|---|---|
| DNS | `dig +short example.com` | `Resolve-DnsName example.com` |
| HTTP | `curl -I https://example.com` | `curl.exe -I https://example.com` |
Expect `200` for the public site and a `302` to `<team>.cloudflareaccess.com` for `admin.` and `api.` (that is Cloudflare Access working).
````

### Draft: Troubleshooting additions (OS-specific)

| Symptom | OS | Fix |
|---|---|---|
| `error: linker 'cc' not found` | Linux | `sudo apt install build-essential` |
| `linker 'link.exe' not found` | Windows native | Install VS Build Tools C++ workload |
| `'sleep' is not recognized` | Windows native | Use WSL2 (or apply the code fix) |
| `command not found: worker-build` | all | Add `~/.cargo/bin` to PATH, restart the shell |
| `EADDRINUSE :8787` | all | macOS/Linux: `lsof -i :8787`. Windows: `netstat -ano \| findstr 8787` |
| Slow or missing file-watch | WSL | Keep the repo in the Linux filesystem, not `/mnt/c` |

### Suggested fixes for the code (flag to maintainers, outside this review's scope)

1. Replace `sleep 3 &&` in `dev:public` with a portable wait (Windows).
2. Decide on and verify the `/api/health` endpoint.
3. Add a preflight check (Node, pnpm, Rust target, `worker-build`, `wrangler whoami`) to the start of `setup.mjs`, and a `--dry-run` option.
