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
