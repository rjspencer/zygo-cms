# Database & SQLite Migrations (Cloudflare D1)

- **Zero-Downtime Expand/Contract**: Multiple worker versions run concurrently during deploys. Expand schema safely before updating code, then contract obsolete columns in a later migration.
- **Strictly Forbid `SELECT *`**: All database queries MUST define explicit column names (e.g., `SELECT id, title, slug FROM entries`) to prevent breakage across decoupled workers.
- **No Non-Constant Defaults in `ALTER TABLE`**: SQLite disallows non-constant defaults (such as `CURRENT_TIMESTAMP`, `CURRENT_DATE`, or expressions) in `ALTER TABLE ... ADD COLUMN`.
  - Always add new columns as nullable: `ALTER TABLE <table> ADD COLUMN <col> <type>;`
  - Follow immediately with an explicit backfill query:
    ```sql
    UPDATE <table> SET <col> = CURRENT_TIMESTAMP WHERE <col> IS NULL;
    ```
- **Binding Nullable / Optional Values in Rust**: Always bind SQL `NULL` using `JsValue::null()`, never JavaScript `undefined`.
- **Built-in Section Templates**: Seed built-in section and layout templates with `is_locked = 1` so system defaults cannot be accidentally overwritten or corrupted.
- **Theme Preview Seed Updates**: When altering section templates or adding new ones, update the `/theme-preview` page entry's `entries.body_json` sample payload to reflect and showcase the new section templates.
