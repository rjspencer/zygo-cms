# Core Package Guidelines

- **Serde Resilience**: All shared structs in `packages/core` (`zygo-core`) must use `#[serde(default)]` so older workers tolerate missing fields. Serde ignores unknown fields by default, so never add `#[serde(deny_unknown_fields)]`: older workers must not fail on new database columns or fields.
- **Strictly Forbid `SELECT *`**: All database queries MUST define explicit column names (e.g., `SELECT id, title, slug FROM entries`) to support zero-downtime Expand/Contract schema migrations across decoupled workers.
- **Binding Nullable / Optional Values in Rust**: Always bind SQL `NULL` using `JsValue::null()`, never JavaScript `undefined`.
  ```rust
  fn opt_js(val: &Option<String>) -> JsValue {
      val.as_deref().map(JsValue::from).unwrap_or_else(JsValue::null)
  }
  ```
