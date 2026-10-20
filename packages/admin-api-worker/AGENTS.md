# Admin API Worker Guidelines

- **Modular Handlers**: Never add inline closures to the main `Router` in worker `src/lib.rs`. All routes must be implemented as standalone functions in their respective handler modules (`packages/admin-api-worker/src/handlers/`).
- **API Route Prefix**: All JSON-returning backend API endpoints must be prefixed with `/api/` (e.g., `/api/entries`, `/api/media`).
- **Securing API Routes**: Any API route requiring authentication must invoke `let _user = auth_required!(&req, ctx);` at the start of the handler to enforce Cloudflare Access / JWT validation and return `401 Unauthorized` when invalid.
- **Local Dev Auth Mocking**: Auth middleware must inspect `env.var("ENVIRONMENT")`. When running in `"dev"` mode, bypass Cloudflare Access verification with a mocked admin user.
- **Service Token Rate Limiting**: Any endpoint accepting Service Tokens or used by MCP/AI tools must implement rate limiting to protect D1 from concurrency spikes.
- **Edge Cache Invalidation**: Whenever content (entries, posts, menus) is created, updated, or deleted, call `cache::purge_urls` to purge the affected canonical URL, the homepage (`/`), RSS (`/rss.xml`), and Sitemap (`/sitemap.xml`).
- **No `wait_until` on `RouteContext`**: In `worker-rs`, `wait_until` exists only on top-level `worker::Context`, not on router closures (`RouteContext<D>`). Implement async side-effects as `async fn` taking `&worker::Env` and await them directly in handlers.
