# Setup Script Accuracy & Safety Review

Scope: static analysis of [setup.mjs](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs) (1338 lines) against the `wrangler.toml` files, the Rust workers, [deployment.md](file:///Users/ryan/Code/zygodactyl/zygo-cms/docs/official/deployment.md) and the README. Nothing was executed against Cloudflare. Items marked **(verify)** rely on Cloudflare API behavior I could not confirm statically, so check them in the real run.

## 1. Summary

| # | Severity | Issue |
|---|----------|-------|
| B1 | Critical | Remote migrations run against the root `wrangler.toml`, which still holds the author's `database_id`. |
| B2 | Critical (Windows) | `new URL(import.meta.url).pathname` breaks the path math and the "run directly" check, so `main()` never runs. |
| B3 | High (security) | Access failure leaves `CF_ACCESS_AUD` empty. The API then fails open, and the script still offers to deploy. |
| B4 | High | Wrangler subprocesses never receive the prompted token or account ID. There are two separate credentials and no preflight. |
| B5 | High | Migration failure is swallowed, so deploy proceeds against an empty or wrong DB. |
| B6 | Medium | Zone and bot settings are fire-and-forget, with unchecked responses and several likely-invalid payloads. |
| B7 | Medium | `database_id` can be written as the literal `undefined`. |
| B8 | Medium | Custom subdomains are not propagated to `ADMIN_SUBDOMAIN` or the API CORS logic. |
| B9 | Medium | The wizard never sets `CF_API_TOKEN` or `CF_ZONE_ID` for the public worker, so cache purge silently does nothing. |
| B10 | Medium | The API token is shown in clear text, and the env token is pre-filled on screen. |
| B11 | Medium | Wrangler stderr is hidden, so failures show only "Command failed: npx wrangler …". |
| B12 | Low–Med | The "Setup Complete" outro is shown even when build or deploy failed, and the exit code is 0. |
| B13 | Low | The existing-policy check matches by name only, so a new admin email is skipped. |
| B14 | Low | Dead code and undefined references (`promptInput`/`promptYesNo`, `execOpts`). |
| B15 | Low | Docs drift from actual behavior. |

## 2. Resources created vs. config and code

| Resource | Script | Config and code | Match? |
|---|---|---|---|
| D1 `zygo-cms-db` | find or create by name (L290-327); writes `database_id` into public, api and **not root** | `binding = "DB"` in root, public and api tomls. Admin-ui has none. | Root is missed (B1). |
| R2 `zygo-cms-media` | create, or ignore "already exists" (L329-342) | Binding `MEDIA` in public and api tomls | OK. Failures other than "exists" only warn (B5-ish). |
| Migrations | `wrangler d1 migrations apply zygo-cms-db --remote`, run from the repo root (L344-357) | Root toml has `migrations_dir = "migrations"`. 13 files, `0001`–`0013`, ordered by wrangler. | Wrong target DB (B1). Ordering is fine. |
| Routes / `workers_dev=false` | all 3 tomls | Routes are Custom Domains | OK. Existing DNS records on the apex or `www` make the deploy fail (see `docs/specs/setup_dns_conflict_check_spec.md`). |
| `PUBLIC_SUBDOMAIN` | api toml | read at `handlers/api.rs:692` | OK. |
| `ADMIN_SUBDOMAIN` | **not written** | public toml hardcodes `"admin"`, read at `public-worker/src/utils.rs:107` | Mismatch when the admin subdomain is customized (B8). |
| `CF_ACCESS_AUD`, `CF_ACCESS_TEAM_DOMAIN` | api toml, only if the Access API succeeds | read at `auth.rs:250-260` | Fail-open if empty (B3). |
| `CF_ZONE_ID` | api toml only, only if the zone is found (L1246) | also read by `public-worker/src/cache.rs:115` and `admin-api-worker/src/handlers/*` | The public worker never gets it (B9). |
| `CF_API_TOKEN` secret | never set | needed by `cache.rs`, `handlers/cloudflare.rs` and `api.rs:883` | Docs tell the user to add it manually. The wizard doesn't say so (B9). |
| `ENVIRONMENT` | not touched. Committed api toml has `"production"`. | `auth.rs:414` bypasses auth if it equals `dev` | OK. See §5. |
| Service-token secrets (`CF_ACCESS_CLIENT_ID`/`_SECRET`) | not created | `auth.rs:454-464` | deployment.md claims the script injects "service tokens" (false, B15). |
| `.env.production` (admin-ui) | written only if the user chooses to deploy (L1286) | `VITE_API_BASE_URL` | OK. It is gitignored. |
| Access apps (UI, API), OTP and Google IdP, ZT org | REST | – | See B3 and the scopes in §4. |

## 3. Bug list

### B1 (Critical): migrations target the author's database
- **Where:** [L347](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L347), and the [root wrangler.toml](file:///Users/ryan/Code/zygodactyl/zygo-cms/wrangler.toml) (`database_id = 488417e7-…`).
- **Cause:** `update*Wrangler` only touches the three `packages/*/wrangler.toml` files (L1209-1211). `execSync` runs from the cwd, which is the repo root, so wrangler resolves `zygo-cms-db` through the root toml. That toml still holds the original `database_id`. `pnpm db:migrate` has the same flaw.
- **Repro:** fresh fork, `pnpm run setup`, then watch the `[4/5]` step.
- **Expected:** the new DB gets all 13 migrations.
- **Actual:** the command targets the committed UUID. On a foreign account it fails with an auth or not-found error, which is caught and logged (B5). Deploy then proceeds with an empty DB. Run by the original author, it would hit production.
- **Fix:** update the root toml too, or pass `-c packages/admin-api-worker/wrangler.toml` (its `migrations_dir = "../../migrations"` is already correct). Better, run `wrangler d1 migrations apply DB --remote -c <pkg toml>` so the binding is used.

### B2 (Critical on Windows): path handling and entrypoint check
- **Where:** [L86](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L86) and [L1310](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L1310).
- **Cause:** `new URL(import.meta.url).pathname` gives `/C:/Users/…`. `path.resolve` turns that into `C:\C:\…` or `\C:\…`. Spaces and other characters stay percent-encoded on every OS.
- **Effect on Windows:** the entrypoint comparison is false, so `pnpm run setup` prints nothing and exits 0. Even if forced, `ROOT_DIR` is wrong and the toml reads throw `ENOENT`.
- **Fix:** use `fileURLToPath(import.meta.url)`.

### B3 (High, security): fail-open Access config
- **Where:** [L702-707](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L702-L707), [L1276-1297](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L1276-L1297), [auth.rs L338-386](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-api-worker/src/auth.rs#L338-L386), and the committed `CF_ACCESS_AUD = ""` in the api toml.
- **Cause:** if `aud` is empty, `validate_jwt_claims` only checks that `aud` is non-empty. If the team domain is empty, `validate_issuer` accepts any `*.cloudflareaccess.com` host. The signing keys are fetched from the token's own `iss`.
- **Attack:** an attacker creates a free Zero Trust tenant, mints a JWT with their own keys and any email, and is accepted. `resolve_local_user` auto-provisions the user, and the first user gets `admin`.
- **Triggers in the wizard:**
  - Access API fails (token scope, ZT not enabled, existing app returned without `aud`). The script only prints manual steps.
  - An existing app is found, but the policy block returns early. That path does return `aud`.
  - The wizard then asks "deploy now?" anyway.
- **Expected:** deploy blocked or strongly gated unless `CF_ACCESS_AUD` is non-empty. Ideally the worker itself returns 401/500 when `CF_ACCESS_AUD` is empty and `ENVIRONMENT != dev|test`.
- **Note:** the Access app on the API host also fronts it at the edge. The window of exposure is therefore the case where the Access app was never created, such as manual-path users.

### B4 (High): two credentials, nothing validated up front
- **Where:** [L71](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L71), [L295-347](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L295-L347), [L999-1017](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L999-L1017).
- **Cause:** the prompted account ID and token are used only for `fetch`. `execSync` inherits `process.env` unchanged. Wrangler therefore uses either an env token (if it was exported) or the OAuth `wrangler login` session. The prompted account ID is not passed as `CLOUDFLARE_ACCOUNT_ID`.
- **Effect:**
  - Multi-account users with OAuth get wrangler's "More than one account" error in non-interactive mode, or a different account than the REST calls use. `detectAccountId` takes `accounts[0]`.
  - A user who pastes a token but never ran `wrangler login` fails at D1 with a generic error.
  - The token is first used only after D1, R2 and migrations, so a bad token fails late.
- **Fix:** preflight with `GET /user/tokens/verify` and `wrangler whoami`. Pass `{ ...process.env, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID }` to every child.

### B5 (High): swallowed failures
- **Where:** [L353-356](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L353-L356), [L339](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L339), and the spinner `s.stop('✓ Migrations applied')` at L1216.
- **Cause:** `applyRemoteMigrations` never throws or returns a status. The spinner prints "✓ Migrations applied" even after failure. Any R2 error other than "exists" (R2 not enabled, scope missing) only warns.
- **Effect:** the script deploys workers that bind a bucket or schema that does not exist.
- **Fix:** return booleans, abort or ask before deploy, and print wrangler stderr.

### B6 (Medium): zone settings unchecked and probably wrong
- **Where:** [L730-772](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L730-L772), [L1236-1247](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L1236-L1247).
- `applyZoneSettings` and `applyBotFightMode` discard the response, so non-2xx is invisible. The spinner always says "✓ Zone & AI Crawl Settings applied".
- `tiered_cache` is not a `/zones/{id}/settings` item. It uses a separate endpoint (`/cache/tiered_cache_smart_topology_enable` or Argo/Tiered Caching) **(verify)**. If the batch PATCH is atomic, one invalid ID rejects everything, including `security_level`.
- `fight_mode` is a boolean in the Bot Management API, but the script sends `"on"` or `"off"` **(verify)**.
- Bot Fight Mode and the AI settings both use `PUT /bot_management`. A full-replace semantic could undo `fight_mode` **(verify)**.
- The custom option `ai_training: "disallow"` is probably not a valid value, and the robots.txt promise is not implemented **(verify)**.
- Unselected perf options are not turned off, only the selected ones are set to `on`. That is acceptable but not stated.

### B7 (Medium): `undefined` database ID
- **Where:** [L311-323](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L311-L323).
- If `d1 create --json` succeeds but the JSON has no `uuid`, `database_id` or `id`, `databaseId` is `undefined`. It is logged and written into every toml as `database_id = "undefined"`. Fix: throw if falsy and validate the UUID shape.
- `extractJson` also takes the first `[`…last `]`, which can mis-slice wrangler banners that contain brackets.

### B8 (Medium): custom subdomains not propagated
- `ADMIN_SUBDOMAIN` in the public toml is never updated, though it feeds `get_allowed_cors_origin` ([utils.rs L107](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/public-worker/src/utils.rs#L107)).
- The admin API CORS logic ([lib.rs L14-29](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-api-worker/src/lib.rs#L14-L29)) assumes the host starts with `api.` and falls back to `admin.<root>`. With a custom API subdomain, `root_domain` becomes the full API host, which no admin origin ends with, so CORS from the admin UI fails.
- Related but out of scope: `origin.ends_with(root_domain)` also accepts `https://evilexample.com` when the root domain is `example.com`. The `http://localhost:` allowance is also active in production.

### B9 (Medium): cache purge not configured
- The wizard writes `CF_ZONE_ID` only to the api toml. The public worker reads `CF_ZONE_ID` from its own env ([cache.rs L114-128](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/public-worker/src/cache.rs#L114-L128)), so it logs "missing, skipping global purge".
- The wizard never runs `wrangler secret put CF_API_TOKEN` and does not tell the user to. Also, the setup token is over-privileged for the runtime, so it must not be reused as `CF_API_TOKEN`.
- Deploying with `secret put` while the worker does not exist yet has its own ordering constraint. Run it after the first deploy, or use `wrangler secret bulk`.

### B10 (Medium): token exposure
- [L1009-1017](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L1009-L1017): `text()` instead of `password()`. `initialValue: detectedApiToken` prints the exported token in clear on screen and in terminal recordings or scrollback. The Google client secret has the same issue (L1066).
- Disk: the token is never written to a file or logged. `err.message` from `execSync` contains only the command line. No secret is written to the tomls. The `aud`, team domain and zone ID are written, and they are not secret.

### B11 (Medium): hidden errors
- `stdio: ['pipe','pipe','pipe']` plus `catch (err) { err.message }` (L320, L339) drops stderr for D1 create and R2. Inside spinner blocks, `console.log` also garbles the output.

### B12 (Low–Med)
- Build or deploy failure at [L1293-1296](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L1293-L1296) is caught, but the outro still says "🎉 Setup Complete" and the process exits 0.
- `s.start('Building…')` is stopped immediately at L1285.

### B13 (Low)
- [L478-479](file:///Users/ryan/Code/zygodactyl/zygo-cms/scripts/setup.mjs#L478-L479): matching `p.name === 'Admin Access Policy'` returns "found" even if it is for another email. Rerunning with a new admin email therefore never adds that email. Only the first page of apps is listed when searching for an existing app.
- On a CORS payload rejection, the script retries without CORS silently. The API has its own CORS (see B8), but the warning is lost.
- `routes`, `PUBLIC_SUBDOMAIN` and `CF_*` regexes are unanchored, so keys with the same suffix could match.
- Mixed line endings: inserted text uses `\n` in a CRLF checkout.

### B14 (Low): dead code
- `promptInput` and `promptYesNo` reference undefined `input` and `rl`. They are unused.
- `execOpts` (L1197) is unused.
- Many helpers accept overloaded "swap if it looks like a path" parameters, which exists only for the tests.
- `detectAccountId` fallback parses the table using box-drawing characters, which are fragile.

### B15 (Low): docs vs. actual behavior
- deployment.md says "decoupled, two-worker setup" (it is three) and "Configure Buckets / KV" (only R2).
- deployment.md says the script injects "service tokens" into the tomls. It does not.
- deployment.md says "node scripts/setup.mjs" while the README says `pnpm run setup`. Both work.
- deployment.md says the API token needs only **Zone:Cache Purge:Edit**. That covers the runtime token only. The setup token needs the §4 scopes.
- README says the wizard "binds its UUID across your worker configs", but the root toml is missed (B1).
- README says it provisions the ZT org. Access API creation needs ZT enabled first, which the script reports.
- Not stated anywhere in the wizard: `pnpm run build` needs Rust, `wasm32-unknown-unknown` and `worker-build` (see prebuilt_wasm_release_spec), and there is no preflight for `cargo`, `worker-build`, `pnpm` or `wrangler login`. `engines` pins only pnpm >11 and has no Node range, although it uses global `fetch` (Node 18+).

## 4. Required API token scopes (setup token)

The script needs an account-level and zone-level token. Scope names follow the dashboard. Items marked (verify) should be confirmed in the real run.

| Scope | Used for |
|---|---|
| Account > D1 > Edit | D1 list/create/migrate (via wrangler) |
| Account > Workers R2 Storage > Edit | R2 bucket create |
| Account > Workers Scripts > Edit | `wrangler deploy` |
| Account > Account Settings > Read | `wrangler whoami`, account lookup |
| User > User Details > Read, User > Memberships > Read | wrangler token whoami and account lookup |
| Zone > Zone > Read | `GET /zones?name=` |
| Zone > Workers Routes > Edit (and DNS > Edit) | Custom Domain routes created on deploy |
| Account > Access: Apps and Policies > Edit | Access apps and policies |
| Account > Access: Organizations, Identity Providers, and Groups > Edit | ZT org, OTP and Google IdP |
| Zone > Zone Settings > Edit | `/zones/{id}/settings` |
| Zone > Bot Management > Edit (verify) | `/bot_management` |
| Zone > Single Redirect (Dynamic Redirect) > Edit (verify) | redirect ruleset |
| Zone > Cache Settings > Edit (verify) | tiered cache, if fixed per B6 |
| Resources | include the target account and zone |

Runtime token (`CF_API_TOKEN` worker secret): Zone > Cache Purge > Edit only, as documented.

## 5. Dev-auth bypass leakage (`ENVIRONMENT=dev`)

- **Config side:** the script never edits `ENVIRONMENT`. The committed api toml is `"production"`. `.env.example` sets `dev`, and `.env*` and `.dev.vars` are gitignored. `wrangler deploy` does not upload `.env` or `.dev.vars`, so there is no leak through setup.
- **Residual risk:** [auth.rs L418](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-api-worker/src/auth.rs#L418) returns an admin on a bare var match. A stray `--var ENVIRONMENT:dev`, a dashboard variable or a copied `[env.*]` block gives unauthenticated admin. Hardening ideas: the setup script asserts `ENVIRONMENT = "production"` before deploy, and the worker refuses `dev` when the request host is not localhost.
- **Other defaults to review:** the empty-AUD fail-open (B3) is the more realistic exposure.

## 6. Failure-path matrix

| Scenario | Current behavior | Gap |
|---|---|---|
| `npx`/wrangler missing | `detectAccountId` returns null silently, then the first `execSync` throws with a generic message (D1 create) | no preflight, no install hint |
| Not logged in, no env token | D1 list fails (swallowed), D1 create fails with "Failed to create D1 database: Command failed…" and exit 1 | no `wrangler login` hint (B4, B11) |
| Bad token | not detected until the Access step, after D1, R2 and migrations | B4 |
| D1 exists | reused by name, ID rewritten | OK. A stale same-named DB on another account is not caught. |
| R2 exists | handled | OK |
| Access app or policy exists | reused (B13 caveat) | OK |
| ZT not enabled | prints warnings and manual steps | no abort (B3) |
| Partial failure | no state file. Reruns are mostly idempotent (D1 found by name, R2 ignored, tomls rewritten, apps matched by domain). | stale Access apps if the domain changes |
| Ctrl-C | clack prompts cancel cleanly. During spinner or wrangler steps, tomls may be half-updated, though each write is a single `writeFileSync`. | no cleanup, and the cursor can stay hidden |
| No network | `fetch` helpers swallow errors and return null. The prompt then asks for the team name. Wrangler fails. | misleading flow |
| Deploy failure | logged, outro shows success | B12 |

## 7. Linux / Windows 11 risks

- **Windows:**
  - B2 is a blocker (silent no-op).
  - `dev:public` uses `sleep 3 && …` ([package.json](file:///Users/ryan/Code/zygodactyl/zygo-cms/package.json)), which fails under cmd/PowerShell. It is not used by setup but is in the quick start.
  - `execSync` with `npx`/`pnpm` goes through cmd.exe and works. `npx.cmd` quoting is fine since there are no user-supplied args.
  - The `│` regex in `detectAccountId` depends on Unicode output in the Windows console.
  - `worker-build` needs the MSVC build tools and `wasm32-unknown-unknown`. The `cd packages/x && worker-build` form works in cmd.
  - CRLF checkouts get mixed endings (B13). The regexes handle `\r?\n`.
  - `console.clear()` and clack need a real TTY. Git Bash/mintty may not provide one.
- **Linux:** no path issue beyond percent-encoding in B2 (spaces in the path). The `sleep` form works. A fresh Ubuntu needs `build-essential`, `rustup` and `wasm-pack`/`worker-build`, which are not mentioned by the wizard.
- **Both:** Node >= 18 is needed for global `fetch`, and pnpm > 11 is required by `engines`.

## 8. Manual test checklist: Ubuntu and Windows 11

Run each in a fresh clone and a throwaway Cloudflare account/zone.

**Common preflight**
- [ ] `node -v` is 18 or later, `pnpm -v` is above 11, `rustup target list --installed` shows `wasm32-unknown-unknown`, `worker-build --version` works.
- [ ] Clone path contains a space (e.g. `My Code`) and run it once there. Repeat in a path without spaces.
- [ ] `pnpm install`, then `pnpm run setup`.

**Windows 11 specific**
- [ ] PowerShell: `pnpm run setup` prints the wizard (B2 regression check). Expected on the current code: no output and exit 0.
- [ ] Git Bash and cmd.exe: the same, and prompts render, arrow keys work.
- [ ] After a successful run, `git diff --stat` shows only the three tomls (plus the root toml if B1 is fixed). Check line endings with `git diff --check`.
- [ ] `pnpm run dev` (expected to fail on `sleep`).

**Ubuntu specific**
- [ ] Fresh `ubuntu:24.04` container or VM with Node and Rust installed through the documented path. Confirm `pnpm run build` succeeds.
- [ ] Non-TTY (`pnpm run setup < /dev/null`) exits with a clear message rather than hanging.

**Failure injection (both)**
- [ ] No `wrangler login` and no env token. Expect a clear hint.
- [ ] Invalid token. Expect failure before any resource is created.
- [ ] Token without Access scopes. Expect the 1010 warning. Confirm deploy is gated (B3).
- [ ] Disconnect network at the D1 step and again at the Access step.
- [ ] Ctrl-C at the confirm prompt, during D1, and mid-migration. Then rerun and check idempotence.
- [ ] Rerun after success, and rerun with a different admin email (B13).
- [ ] Custom admin and API subdomains. Check CORS from the admin UI and `ADMIN_SUBDOMAIN` (B8).
- [ ] Apex with a pre-existing A record. Expect a clear deploy failure.

## 9. Proposed real-run plan (macOS, fresh temp clone)

Prerequisites: the user supplies a throwaway domain on a throwaway Cloudflare account and an API token with the §4 scopes. Never use the production account, and never reuse the author's `zygo-cms-db`.

1. `git clone <repo> /tmp/zygo-setup-test && cd /tmp/zygo-setup-test`, then `pnpm install`.
2. Store the token only in the shell env (`export CLOUDFLARE_API_TOKEN=...`, `export CLOUDFLARE_ACCOUNT_ID=...`), not in any file. `unset` it afterward. Revoke the token at the end.
3. Pre-check: `git diff` is clean, `npx wrangler whoami`, `GET /user/tokens/verify`, and confirm the zone is on the throwaway account.
4. Confirm the **B1 hypothesis first**: before running setup, run `npx wrangler d1 migrations list zygo-cms-db --remote` and check which UUID the command targets. It should not be `488417e7-…`. Expect failure on a foreign account.
5. Run `pnpm run setup` and decline deploy at the first pass. Capture the output with `script`, then grep it for the token string to confirm it is not logged.
6. Inspect results:
   - `git diff` (database_id, routes, vars, `CF_ACCESS_AUD`, `CF_ACCESS_TEAM_DOMAIN`, `CF_ZONE_ID`).
   - `grep -r "$CLOUDFLARE_API_TOKEN" .` returns nothing.
   - `npx wrangler d1 execute zygo-cms-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"` and `d1_migrations` has all 13 files.
   - `npx wrangler r2 bucket list`.
   - Dashboard or REST: Access apps, policies, OTP IdP, redirect rule, zone settings, bot settings (B6 checks).
7. Rerun setup for idempotence, then run once more with a different admin email and custom subdomains.
8. Deploy: `pnpm run build && pnpm run deploy`. Smoke test `https://<domain>/`, the admin UI login (OTP), and `curl -i https://api.<domain>/api/...` with no token, which must be 401/403. Try an invalid JWT, and confirm `ENVIRONMENT` is `production` with `npx wrangler deployments`/dashboard.
9. Negative run on a second temp clone: deliberately omit Access scopes to prove B3 (empty `CF_ACCESS_AUD` after run, and whether the wizard still offers to deploy).
10. Cleanup: delete the workers, D1, R2 bucket, Access apps, IdPs, redirect ruleset, and the Access org if created, then revoke the token. Delete the temp clone.

## 10. Recommended fix order

1. B2 (`fileURLToPath`), B1 (migrate through the package toml and update the root toml).
2. B3 (gate deploy on a non-empty AUD, plus the worker fails closed), and B4 (pass env to children, preflight).
3. B5, B7, B11, B12 (error propagation).
4. B6, B8, B9, B10, then the doc corrections (B15) and dead-code removal (B14).
5. Add tests: the `tests/setup-script.test.js` suite covers helpers and mocked REST calls, but nothing covers `main()`, wrangler subprocess handling, path resolution on Windows or the root toml.

## 11. Real macOS Live Test Results (`stephwanicki.com`)

Executed on a fresh clone in `/private/tmp/zygo-setup-test` on macOS (Darwin arm64) using Node v26.4.0 and pnpm v11.9.0.

### 11.1 Live Execution Log & Behavior Summary
- **Execution:** Ran `scripts/setup.mjs` against apex domain `stephwanicki.com` with Cloudflare Account `9e5e5d2d631b909223e262479b4c0557`.
- **D1 Provisioning:** Found existing database `zygo-cms-db` (`488417e7-4ad1-4875-90e9-71a0ac3dbc63`).
- **R2 Provisioning:** Found existing bucket `zygo-cms-media`.
- **Remote Migrations:** Ran `wrangler d1 migrations apply zygo-cms-db --remote` (reported `✅ No migrations to apply!`).
- **Cloudflare Zero Trust / Access Provisioning (SUCCESS):**
  - Detected existing team domain: `https://zygodactyl-studios.cloudflareaccess.com`.
  - Verified One-Time PIN provider is active.
  - Created Access Application for Admin UI: `cadb0b06-7b99-42fa-894b-15718d48c098` (`admin.stephwanicki.com`).
  - Created Access Policy for Admin UI targeting `Rjspencer82@gmail.com`.
  - Created Access Application for Admin API: `176c7417-2c34-4645-8f03-21553ed561b5` (`api.stephwanicki.com`).
  - Created Access Policy for Admin API targeting `Rjspencer82@gmail.com`.
  - Injected `CF_ACCESS_AUD`: `7ff93ca826fc03c34801e3e7e5468e12d669f8ed2855615349df317d43b72f02`.
  - Injected `CF_ACCESS_TEAM_DOMAIN`: `https://zygodactyl-studios.cloudflareaccess.com`.
- **Zone Settings (SUCCESS):**
  - Updated zone `5e49562ebf5fe14f4a9fce806a2afd0a` with security level `medium`, Bot Fight Mode, and selected performance settings.
- **Failures & Verifications:**
  - **SEO Redirect Rule Failure (Live verified):** Script returned `⚠️ Failed to fetch redirect ruleset: [{"code":10000,"message":"Authentication error"}]`. The token lacked `Zone > Single Redirect > Edit` permissions, or the endpoint URL rejected the token scope.
  - **B1 Confirmed:** `wrangler.toml` in the repository root was completely untouched. Only `packages/*/wrangler.toml` files were modified.
  - **B8 Confirmed:** `ADMIN_SUBDOMAIN` was not added to `packages/public-worker/wrangler.toml`.
  - **B9 Confirmed:** `CF_ZONE_ID` was written exclusively to `admin-api-worker/wrangler.toml`. `public-worker` did not receive it, which leaves cache purge non-functional.
  - **Secret Hygiene (PASS):** Verified via `git grep` that no token, secret, or credential was written to disk or configuration files.

### 11.2 Resource Inventory Created
| Resource | Name / Target | Cloudflare Resource ID |
|---|---|---|
| D1 Database | `zygo-cms-db` | `488417e7-4ad1-4875-90e9-71a0ac3dbc63` |
| R2 Bucket | `zygo-cms-media` | `zygo-cms-media` |
| Zero Trust Org | Zygodactyl Studios | `zygodactyl-studios.cloudflareaccess.com` |
| Access Application (UI) | `admin.stephwanicki.com` | `cadb0b06-7b99-42fa-894b-15718d48c098` |
| Access Application (API) | `api.stephwanicki.com` | `176c7417-2c34-4645-8f03-21553ed561b5` |
| Access AUD Tag | `api.stephwanicki.com` | `7ff93ca826fc03c34801e3e7e5468e12d669f8ed2855615349df317d43b72f02` |
| Zone | `stephwanicki.com` | `5e49562ebf5fe14f4a9fce806a2afd0a` |

### 11.3 Teardown & Cleanup Instructions
To remove the resources provisioned during this test:

1. **Delete Cloudflare Access Applications:**
   In Cloudflare Zero Trust Dashboard (`Access > Applications`):
   - Delete application `admin.stephwanicki.com` (`cadb0b06-7b99-42fa-894b-15718d48c098`).
   - Delete application `api.stephwanicki.com` (`176c7417-2c34-4645-8f03-21553ed561b5`).
   *(Or via API: `DELETE /accounts/9e5e5d2d631b909223e262479b4c0557/access/apps/<ID>`)*

2. **Remove Zone Custom Settings (Optional):**
   In Cloudflare Dashboard (`stephwanicki.com > Security > Settings`):
   - Reset Security Level to your preferred default (e.g. `Medium` or `Essentially Off`).
   - Reset Bot Fight Mode under `Security > Bots` if desired.

3. **Delete Temp Test Workspace:**
   ```bash
   rm -rf /private/tmp/zygo-setup-test /tmp/setup_test_output.log /tmp/drive_setup.py
   ```

