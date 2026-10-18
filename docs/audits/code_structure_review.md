# Code Structure Review: Zygo CMS

## Overview

The `zygo-cms` project is built on a modern stack utilizing Cloudflare Workers (`worker-rs`), D1 (SQLite), Askama for SSR templating, and Tailwind CSS. The frontend testing uses Vitest with HappyDOM. Overall, the codebase demonstrates a solid understanding of the technologies and adheres to the project guidelines, but suffers from significant router bloat and some organizational inconsistencies.

## Strengths

1. **Separation of Models and Data Access**: 
   - The codebase has a clear boundary between data structures (`src/models/`) and database operations (`src/db/`). This makes the data layer easy to navigate.
2. **Adherence to Project Guidelines**:
   - Frontend tests (`tests/editor.test.js`) correctly load real Askama templates using `fs.readFileSync` and strip out template tags, avoiding hardcoded mock HTML strings.
   - Cloudflare D1 bindings correctly map `Option<T>` to `JsValue::null()` instead of `undefined` using helpers like `opt_js` inside `src/db/mod.rs`.
   - Async side effects (e.g., cache purging, R2 sync) are awaited directly in the handlers, avoiding the use of `wait_until` on `RouteContext`.
3. **Frontend Testing**:
   - The frontend tests are comprehensive, well-structured, and use standard tools (Vitest, Testing Library) effectively with a mocked DOM.

## Areas for Improvement & Critique

### 1. Router Bloat (`src/lib.rs`)
The biggest issue in the current codebase is the massive inline `Router` definition in `src/lib.rs` (spanning nearly 1,000 lines). The `fetch` event handler registers all routes and implements the entire request/response lifecycle, data fetching, caching, and template preparation inline. 

**Recommendation**: 
Abstract the closures into separate handler modules (e.g., `src/handlers/admin.rs`, `src/handlers/api.rs`, `src/handlers/public.rs`). The router should merely map routes to these functions:
```rust
.get_async("/admin", handlers::admin::dashboard)
```

### 2. Duplicate Route Logic
Because everything is inline, there is direct code duplication. For example, the closures for `GET /admin` and `GET /admin/entries` are 100% identical. 

**Recommendation**: 
Point both routes to the same handler function, or have one redirect to the other, to adhere to DRY principles.

### 3. Inconsistent API Routing
The CMS exposes a JSON API, but the URL structure is inconsistent:
- Media endpoints are under `/api/media`.
- Menu endpoints are under `/api/menus`.
- Revisions are under `/api/entries/:id/revisions`.
- **However**, core entry CRUD operations are mounted at the root: `POST /entries`, `PUT /entries/:id`, `DELETE /entries/:id`.

**Recommendation**: 
Move all JSON API endpoints under the `/api/` prefix (e.g., `/api/entries`) to clearly separate the API namespace from the public UI routes.

### 4. Caching Boilerplate
The caching logic is repetitive across all public read endpoints (`/`, `/post/:slug`, `/rss.xml`, `/sitemap.xml`). Almost every public route manually checks `cache::get_cached(&req)` at the top and calls `cache::put_cached(&req, &mut res)` at the bottom.

**Recommendation**: 
If `worker-rs` supports middleware or wrapper functions in the router, abstract this caching layer so that public routes automatically serve and store cache without repeating the logic in every handler.

### 5. D1 SQL Boilerplate
The `src/db/` modules make heavy use of raw SQL. While this is expected for D1 (since ORMs are not fully mature for this runtime), the pattern of preparing, binding, running, and mapping results is highly repetitive.

**Recommendation**: 
Consider creating a small internal query builder or generic macro/function for standard CRUD operations to reduce the noise in `src/db/entry.rs` and related files.

## Conclusion

The code is generally **high quality** and pragmatic, successfully implementing a Cloudflare-native CMS. The abstractions at the data layer (`db` vs `models`) are sufficient and well-designed. However, the **organization at the routing layer** needs immediate attention. Refactoring `src/lib.rs` to extract route handlers into separate modules will drastically improve maintainability, testability, and readability as the project grows.
