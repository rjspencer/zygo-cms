# Project Guidelines: Zygo CMS (Cloudflare Workers + D1 + Rust)

## Cloudflare D1 & SQLite Migrations
- **No Non-Constant Defaults in ALTER TABLE**: SQLite strictly disallows non-constant defaults (such as `CURRENT_TIMESTAMP`, `CURRENT_DATE`, or expressions) in `ALTER TABLE ... ADD COLUMN`.
  - Always add the column as nullable (`ALTER TABLE <table> ADD COLUMN <col> <type>;`).
  - Follow immediately with a backfill query: `UPDATE <table> SET <col> = CURRENT_TIMESTAMP WHERE <col> IS NULL;`.

## Cloudflare D1 Rust Bindings
- **Binding Nullable / Optional Values**: Always bind SQL `NULL` using `JsValue::null()`, never JavaScript `undefined`.
  - Recommended pattern:
    ```rust
    fn opt_js(val: &Option<String>) -> JsValue {
        val.as_deref().map(JsValue::from).unwrap_or_else(JsValue::null)
    }
    ```

## Development & Pair Programming Conventions
- The user writes code and runs terminal commands; provide clean, minimal, and modular code snippets.
- Focus strictly on requested functionality without introducing unneeded dependencies or extra features.

## Subagent Workflows
- **Backend Workflow**: For non-visual changes (Rust logic, D1, APIs), delegate feature implementation to a subagent, followed by a standard Code Review Subagent to check logic, tests, and security before committing.
- **Frontend/UI Workflow (1+2+4 Protocol)**: For ANY visual UI component changes, you must strictly follow this protocol:
  1. **Build**: Build the React component and create a corresponding `.stories.tsx` file for Storybook.
  2. **Automate**: Ensure the component passes Playwright tests via the `@storybook/test-runner`.
  3. **Handoff**: Invoke a strict `ui-qa` Subagent. Provide it with the local Storybook URL for the component (e.g., `http://localhost:6006/?path=/story/...`).
  4. **Vision Validation**: The `ui-qa` Subagent MUST open the URL in a headless browser, interact with the component, and use its Vision capabilities to actively check for visual regressions (e.g. clipped dropdowns, z-index issues, overflowing text). The commit is blocked until the `ui-qa` agent approves it.

## Cloudflare Workers & `worker-rs` Routing
- **No `wait_until` on `RouteContext`**: In `worker-rs`, `wait_until` exists only on the top-level `worker::Context`, not on router closures (`RouteContext<D>`).
  - Implement async side-effects (e.g., cache invalidation, webhooks) as `async fn` taking `&worker::Env` and await them directly in route handlers.

## Frontend Testing Conventions (Vitest + HappyDOM + Testing Library)
- **Templates as Single Source of Truth**: Never hardcode mock HTML strings in test files. Always load the real Askama template from `templates/` via `fs.readFileSync` and strip template tags.
- **Offline CDN Import Mocking**: Client scripts using browser CDN imports (`https://esm.sh/...`) must be aliased in `vitest.config.js` to lightweight local stubs (`tests/mocks/esm.js`) to keep tests offline and fast.
- **Hidden Elements in DOM Testing**: Testing Library's `getByRole` ignores elements inside `display: none` containers by default. Toggle container visibility before querying elements.

## SEO & Canonical URL Conventions
- **Domain Normalization**: Always resolve canonical origins using `utils::get_canonical_origin`, which respects `CANONICAL_ORIGIN` or auto-strips `www.` to prevent duplicate content indexing.
- **Trailing Slash Rules**: Homepage canonical strictly includes a trailing slash (`{origin}/`); post and page canonicals strictly omit trailing slashes (`{origin}/post/:slug`).

## Agent Context Management
- **Context Monitoring**: Monitor the conversation context and notify the user if the context limit is being approached or if the system begins auto-summarizing previous messages, so the user can start a fresh chat to maintain optimal AI performance.

## Router & API Structure
- **Modular Handlers**: Never add inline closures to the main `Router` in `src/lib.rs`. All new routes must be implemented as standalone functions in the appropriate `src/handlers/` module (`admin.rs`, `api.rs`, or `public.rs`).
- **API Prefix**: All JSON-returning API endpoints must be prefixed with `/api/` (e.g. `/api/entries`, not `/entries`).

## Edge Caching
- **Cache Invalidation**: Whenever content (entries, posts, menus) is created, updated, or deleted, you must invoke `cache::purge_urls` to purge the affected canonical URL, the homepage (`/`), the RSS feed (`/rss.xml`), and the Sitemap (`/sitemap.xml`) to ensure edge caches reflect the latest database state.

## Authentication
- **Securing API Routes**: Any API route requiring authentication must use the `let _user = auth_required!(&req, ctx);` macro at the very beginning of the handler. This macro automatically handles the early return of `401 Unauthorized` responses.

## Git Commit
- **Test Verification**: Always run `pnpm run test:all` and `cargo test` and verify all tests pass before committing any code.
- **Build Verification**: Always run `pnpm run build` to verify the entire project (Rust workers and Admin UI) compiles without errors before committing any code.

## Two-Worker Architecture AI Directives
1. **Strictly Forbid `SELECT *`:** Explicitly require all database queries to define exact column names (e.g., `SELECT id, title FROM...`) to support Expand/Contract schema migrations across decoupled workers.
2. **Serde Resilience:** Mandate that all shared structs in `zygo-core` use `#[serde(default)]` and `#[serde(skip_unknown_fields)]` so older workers do not panic when encountering new database columns.
3. **Local Dev Auth Mocking:** Mandate that any auth middleware checks `env.var("ENVIRONMENT")` and bypasses Cloudflare Access verification with a mocked admin JWT when running in `dev` mode.
4. **Service Token Rate Limiting:** Require any endpoint accepting Service Tokens (for MCP/AI usage) to implement strict rate limiting to protect D1 from concurrency spikes.
