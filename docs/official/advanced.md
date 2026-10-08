# Development & Advanced

For contributors and developers looking to extend the core capabilities of Zygo CMS.

## Writing Custom Rust Logic (`worker-rs`)

Zygo CMS is powered by Cloudflare Workers written in Rust using the `worker-rs` crate. The core logic is housed in `packages/core`, and the workers (Admin and Site) are in `apps/`.

### Routing and Handlers
- **Modular Handlers:** Never add inline closures to the main `Router` in `src/lib.rs`. All new routes must be implemented as standalone functions in the appropriate `src/handlers/` module (e.g., `admin.rs`, `api.rs`, or `public.rs`).
- **API Prefix:** All JSON-returning API endpoints must be prefixed with `/api/` (e.g., `/api/entries`).

### Side Effects and Background Tasks
- **No `wait_until` on `RouteContext`:** In `worker-rs`, `wait_until` exists only on the top-level `worker::Context`, not on router closures (`RouteContext<D>`).
- Implement async side-effects (e.g., cache invalidation, webhooks) as `async fn` taking `&worker::Env` and await them directly in your route handlers.

### D1 Bindings and Optional Values
- **Binding Nullable / Optional Values:** Always bind SQL `NULL` using `JsValue::null()`, never JavaScript `undefined`.
- Recommended pattern:
  ```rust
  fn opt_js(val: &Option<String>) -> JsValue {
      val.as_deref().map(JsValue::from).unwrap_or_else(JsValue::null)
  }
  ```

### Database Queries and Models
- **Database Queries:** Located in `packages/core/src/db`. Ensure all queries use prepared statements and explicitly name columns instead of using `SELECT *`.
- **Models:** Defined in `packages/core/src/models`. We utilize `serde` heavily. Ensure new fields include `#[serde(default)]` and `#[serde(skip_unknown_fields)]` to maintain backwards compatibility between the two workers during deployment rollouts.

## Two-Tier Testing Architecture

We employ a strict two-tier testing strategy to separate fast, offline unit tests from full end-to-end integration tests.

### 1. DOM & Template Testing (Level 1 - HappyDOM)
We use Vitest, HappyDOM, and `@testing-library/dom` for testing our server-side rendered Askama templates and client-side interactions. This runs completely offline and is very fast.

```bash
pnpm run test
```

**Conventions:**
- **Templates as Single Source of Truth:** Never hardcode mock HTML strings in test files. Always load the real Askama template from `templates/` via `fs.readFileSync` and strip template tags to test the real structure.
- **Offline CDN Import Mocking:** Client scripts using browser CDN imports (`https://esm.sh/...`) must be aliased in `vitest.config.js` to lightweight local stubs (`tests/mocks/esm.js`) to keep tests offline and fast.
- **Hidden Elements in DOM Testing:** Testing Library's `getByRole` ignores elements inside `display: none` containers by default. Toggle container visibility before querying elements.

### 2. Worker Integration (Level 2 - `unstable_dev`)
End-to-end integration tests that boot the compiled Rust Wasm worker in a simulated Cloudflare environment via Wrangler `unstable_dev`. This tests the actual HTTP boundaries, D1 database interactions, and Cloudflare bindings.

```bash
pnpm run test:e2e
```

## D1 SQLite Migration Rules

Cloudflare D1 is backed by SQLite, which has strict limitations on `ALTER TABLE` statements. When creating new migrations in the `migrations/` folder, you must adhere to these rules:

### No Non-Constant Defaults
SQLite strictly disallows non-constant defaults (such as `CURRENT_TIMESTAMP`, `CURRENT_DATE`, or expressions) in `ALTER TABLE ... ADD COLUMN`.

### The Pattern
1. Always add the new column as nullable.
2. Follow it immediately with an `UPDATE` backfill query.

**Code Example:**

```sql
-- INCORRECT: Will fail in SQLite
ALTER TABLE entries ADD COLUMN published_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- CORRECT PATTERN
-- 1. Add the column as nullable
ALTER TABLE entries ADD COLUMN published_at DATETIME;

-- 2. Backfill existing rows
UPDATE entries SET published_at = CURRENT_TIMESTAMP WHERE published_at IS NULL;

-- 3. (Optional) Create an index if frequently queried
CREATE INDEX idx_entries_published_at ON entries(published_at);
```

Another example with a boolean flag:

```sql
-- Add a new active flag to users
ALTER TABLE users ADD COLUMN is_active INTEGER;

-- Backfill existing users to be active by default
UPDATE users SET is_active = 1 WHERE is_active IS NULL;
```
