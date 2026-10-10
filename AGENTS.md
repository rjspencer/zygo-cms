# Project Guidelines: Zygo CMS (Cloudflare Workers + D1 + Rust)

## 1. Pre-Commit Validation & Quality Gates (Mandatory)
Before committing any code or marking any task as complete, you MUST execute and pass all validation gates in order:

1. **Rust Tests**: Run `cargo test` to verify core logic, database models, and worker handlers.
2. **Web Tests**: Run `pnpm run test:all` to run root and sub-package Vitest test suites.
3. **TypeScript Typecheck**: Run `pnpm --filter admin-ui exec tsc --noEmit` to verify type safety in the Admin UI.
4. **Production Build Verification**: Run `pnpm run build` to confirm all Rust Wasm workers and the React Admin UI compile without errors.
5. **UI QA Gate (if UI touched)**: For any visual component changes, the **1+2+4 Protocol** must pass before committing.

---

## 2. Subagent Workflows

### Backend Workflow
For non-visual changes (Rust logic, D1 schema, REST APIs):
1. Delegate feature implementation to a subagent or complete it cleanly.
2. Delegate verification to a Code Review Subagent (or invoke `self` configured as a Code Reviewer) to inspect logic, test coverage, and security before committing.

### Frontend/UI Workflow (1+2+4 Protocol)
For **ANY** visual UI component changes in `packages/admin-ui`, strictly adhere to this four-step protocol:
1. **Build**: Build the React component and create a corresponding `.stories.tsx` file for Storybook.
2. **Automate**: Ensure the component passes Playwright tests via the `@storybook/test-runner` or Vitest Storybook integration (`pnpm --filter admin-ui test-storybook`).
3. **Handoff**: Invoke a strict `ui-qa` Subagent. (If `ui-qa` is not pre-registered in the environment, define it via `define_subagent` or invoke `self` with an explicit UI QA prompt and browser inspection tools). Provide it with the local Storybook URL (e.g. `http://localhost:6006/?path=/story/...`).
4. **Vision Validation**: The `ui-qa` Subagent MUST inspect the rendered component via browser tooling/screenshots, interact with states (hover, open dialogs, focus), and verify absence of visual regressions (e.g., clipped dropdowns, z-index collisions, overflowing text). The commit is blocked until approved.

---

## 3. Database & SQLite Migrations (Cloudflare D1)

- **Strictly Forbid `SELECT *`**: All database queries MUST define explicit column names (e.g., `SELECT id, title, slug FROM entries`) to support zero-downtime Expand/Contract schema migrations across decoupled workers.
- **No Non-Constant Defaults in `ALTER TABLE`**: SQLite disallows non-constant defaults (such as `CURRENT_TIMESTAMP`, `CURRENT_DATE`, or expressions) in `ALTER TABLE ... ADD COLUMN`.
  - Always add new columns as nullable: `ALTER TABLE <table> ADD COLUMN <col> <type>;`
  - Follow immediately with an explicit backfill query:
    ```sql
    UPDATE <table> SET <col> = CURRENT_TIMESTAMP WHERE <col> IS NULL;
    ```
- **Binding Nullable / Optional Values in Rust**: Always bind SQL `NULL` using `JsValue::null()`, never JavaScript `undefined`.
  ```rust
  fn opt_js(val: &Option<String>) -> JsValue {
      val.as_deref().map(JsValue::from).unwrap_or_else(JsValue::null)
  }
  ```

---

## 4. Multi-Worker Monorepo Architecture

The workspace is organized into discrete packages:
- `packages/public-worker`: Public-facing SSR worker (Rust + Askama templates + D1 cache).
- `packages/admin-api-worker`: Authenticated REST API worker (Rust + Cloudflare Access + D1 + R2).
- `packages/admin-ui`: Single Page Application admin dashboard (React 19 + Vite + Radix Themes).
- `packages/core`: Shared Rust models, errors, and validation logic (`zygo-core`).
- `packages/zygo-mcp`: Model Context Protocol server bridge for external AI agents.

### Worker Directives
- **Serde Resilience**: All shared structs in `packages/core` (`zygo-core`) must use `#[serde(default)]` and `#[serde(skip_unknown_fields)]` so older workers do not panic when encountering new database columns or fields.
- **Modular Handlers**: Never add inline closures to the main `Router` in worker `src/lib.rs`. All routes must be implemented as standalone functions in their respective handler modules (`packages/admin-api-worker/src/handlers/` or `packages/public-worker/src/handlers/`).
- **API Route Prefix**: All JSON-returning backend API endpoints must be prefixed with `/api/` (e.g., `/api/entries`, `/api/media`).
- **No `wait_until` on `RouteContext`**: In `worker-rs`, `wait_until` exists only on top-level `worker::Context`, not on router closures (`RouteContext<D>`). Implement async side-effects as `async fn` taking `&worker::Env` and await them directly in handlers.
- **Edge Cache Invalidation**: Whenever content (entries, posts, menus) is created, updated, or deleted, call `cache::purge_urls` to purge the affected canonical URL, the homepage (`/`), RSS (`/rss.xml`), and Sitemap (`/sitemap.xml`).
- **SEO & Canonical URLs**: Always resolve canonical origins using `utils::get_canonical_origin`. Strictly include trailing slash for homepage (`{origin}/`) and omit trailing slash for posts/pages (`{origin}/post/:slug`).

---

## 5. Security & Authentication

- **Securing API Routes**: Any API route requiring authentication must invoke `let _user = auth_required!(&req, ctx);` at the start of the handler to enforce Cloudflare Access / JWT validation and return `401 Unauthorized` when invalid.
- **Local Dev Auth Mocking**: Auth middleware must inspect `env.var("ENVIRONMENT")`. When running in `"dev"` mode, bypass Cloudflare Access verification with a mocked admin user.
- **Service Token Rate Limiting**: Any endpoint accepting Service Tokens or used by MCP/AI tools must implement rate limiting to protect D1 from concurrency spikes.

---

## 6. Testing Conventions

### Public Worker SSR Tests (Askama + Vitest)
- **Templates as Single Source of Truth**: Never hardcode mock HTML strings in tests for public SSR rendering. Always load real Askama templates from `templates/` via `fs.readFileSync` and strip template tags.
- **Offline CDN Mocking**: Client scripts loaded via browser CDN imports (`https://esm.sh/...`) must be aliased in `vitest.config.js` to lightweight local stubs (`tests/mocks/esm.js`).

### Admin UI Tests (React 19 + Vitest + Testing Library)
- See [`packages/admin-ui/AGENTS.md`](packages/admin-ui/AGENTS.md) for detailed React Query, MSW, and accessibility testing conventions.
- Remember: Testing Library's `getByRole` ignores elements inside `display: none` containers by default; toggle container visibility before querying.

---

## 7. Agent Context Management

- **Context Monitoring**: Monitor conversation context usage. Notify the user if the conversation context approaches limits or if system auto-summarization begins, recommending a fresh session to maintain peak execution accuracy.
- **Development Conventions**: Focus strictly on implementing requested features cleanly without introducing speculative or unneeded dependencies.
