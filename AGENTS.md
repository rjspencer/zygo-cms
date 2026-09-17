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

