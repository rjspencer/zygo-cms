# Contributing to Zygo CMS

Thanks for your interest in contributing! This document describes how to propose changes.

## Getting Started

See the [README](README.md) for local development setup and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the packages fit together.

## Workflow

1. Open an issue to discuss significant changes before starting work.
2. Fork the repository and create a branch from `main`.
3. Keep changes focused. Implement what the issue describes, without unrelated features or dependencies.
4. Make sure all checks pass locally:
   - `cargo test`
   - `pnpm run test:all`
   - `pnpm --filter admin-ui exec tsc --noEmit`
   - `pnpm run build`
5. Open a pull request against `main` describing what changed and why.

## Code Guidelines

- No `SELECT *` in SQL. List explicit column names.
- All JSON-returning endpoints are prefixed `/api/`.
- Worker routes are standalone functions in `src/handlers/`, not inline closures in the `Router`.
- Authenticated routes start with `let _user = auth_required!(&req, ctx);`.
- Features added or changed in `admin-ui` or `admin-api-worker` must also be exposed through both WebMCP (`packages/admin-ui/src/lib/webmcp/`) and the CLI MCP bridge (`packages/zygo-mcp/index.mjs`), with tests.
- Record completed work in `CHANGELOG.md`, and update `docs/official/` when CMS functionality changes.

## License and Contributor License Agreement

Zygo CMS is licensed under `MIT OR Apache-2.0` (see [LICENSE-MIT](LICENSE-MIT) and [LICENSE-APACHE](LICENSE-APACHE)).

Before your first pull request can be merged, you must agree to the Contributor License Agreement below. By submitting a contribution, you confirm that:

1. You wrote the contribution, or have the right to submit it.
2. You grant Ryan Spencer, the project maintainer, a perpetual, worldwide, non-exclusive, royalty-free, irrevocable license to use, reproduce, modify, sublicense and distribute your contribution under any license, including the project's current license and any future open source or commercial license.
3. You grant recipients of the software a perpetual, worldwide, non-exclusive, royalty-free, irrevocable patent license for your contribution.
4. You retain copyright in your contribution.

## Security

Please do not report security vulnerabilities in public issues. Contact the maintainer privately instead.
