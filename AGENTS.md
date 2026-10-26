# Project Guidelines: Zygo CMS (Cloudflare Workers + D1 + Rust)

Architecture map: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Package-specific rules live in nested `AGENTS.md` files; task workflows live in skills (see §5).

## 1. Packages

- `packages/public-worker`: Public SSR worker (Rust + MiniJinja + D1 cache).
- `packages/admin-api-worker`: Authenticated REST API worker (Rust + Cloudflare Access + D1 + R2).
- `packages/admin-ui`: Admin SPA (React 19 + Vite + Radix Themes).
- `packages/core`: Shared Rust models, errors, validation (`zygo-core`).
- `packages/template-wasm`: Section template rendering compiled to Wasm for live preview in admin-ui.
- `packages/zygo-mcp`: MCP server bridge for external AI agents.
- `migrations/`: D1 SQL migrations.

## 2. Always-On Rules

- **No `SELECT *`**: Always list explicit column names in SQL (supports zero-downtime Expand/Contract migrations).
- **API prefix**: All JSON-returning endpoints are prefixed `/api/`.
- **Modular handlers**: Never add inline closures to the `Router` in worker `src/lib.rs`; routes are standalone functions in `src/handlers/`.
- **Auth**: Any authenticated route starts with `let _user = auth_required!(&req, ctx);`.
- **Focus**: Implement exactly what is requested. No speculative features or dependencies.

## 3. Pre-Commit Gates (Mandatory)

Before committing or marking a task complete, all of these must pass: `cargo test`, `pnpm run test:all`, `pnpm --filter admin-ui exec tsc --noEmit`, `pnpm run build`. For UI changes, also run the 1+2+4 protocol. Full procedure (branching, phased commits, CI sync, PR template): `commit` skill.

## 4. MCP Parity Gate (Mandatory)

Any feature or API added or changed in `admin-ui` or `admin-api-worker` must be usable by agents through **both** in-browser WebMCP (`packages/admin-ui/src/lib/webmcp/`) and the CLI MCP bridge (`packages/zygo-mcp/index.mjs`), with strict input schemas and Vitest coverage for both. Details: `webmcp-parity-audit` skill.

## 5. Where Things Live

| Need | Go to |
| :--- | :--- |
| Commit, branch, PR workflow | skill `commit` |
| Writing/refactoring React in admin-ui | skills `react-code`, `refactor-react-component-into-module`, `react-testing-library` |
| Visual UI change QA, subagent waves | skill `ui-qa-handoff` |
| WebMCP tools / editor parity | skill `webmcp-parity-audit` |
| Public site CSS, tokens, section templates | skill `zygo-theming` |
| Picking the next roadmap task | skill `next` |
| Public SSR, assets, SEO, a11y | `packages/public-worker/AGENTS.md` |
| REST handlers, auth, cache purge | `packages/admin-api-worker/AGENTS.md` |
| Shared structs, serde, D1 bindings | `packages/core/AGENTS.md` |
| CLI MCP tools | `packages/zygo-mcp/AGENTS.md` |
| Admin UI data fetching, tests | `packages/admin-ui/AGENTS.md` |
| D1 migrations | `migrations/AGENTS.md` |
| Docs, specs, audits | `docs/AGENTS.md` |

## 6. Security

- Local dev: auth middleware checks `env.var("ENVIRONMENT")`; in `"dev"` it bypasses Cloudflare Access with a mocked admin user.
- Endpoints accepting Service Tokens or used by MCP/AI tools must rate-limit to protect D1.

## 7. Project Tracking

- `ROADMAP.md`: active priorities and backlog only. Do NOT record completed work there.
- `CHANGELOG.md`: record completed, verified work ([Keep a Changelog](https://keepachangelog.com/)).
- `docs/specs/<feature>_spec.md`: design specs, linked from the roadmap. `docs/audits/`: audits and reviews. `docs/official/`: user-facing docs, updated whenever CMS functionality changes (see `docs/AGENTS.md`).

## 8. Agent Context Management

Notify the user if conversation context approaches limits or auto-summarization begins, and recommend a fresh session.
