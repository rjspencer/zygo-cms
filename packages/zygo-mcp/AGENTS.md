# Zygo MCP Server Guidelines

- **WebMCP Parity**: Maintain feature parity with in-browser WebMCP (`packages/admin-ui/src/lib/webmcp/`). When backend REST API endpoints, content models, or global CMS actions are added/modified, update `packages/zygo-mcp/index.mjs`. Use the parity audit skill in `.agents/skills/webmcp-parity-audit/SKILL.md`.
- **Tool Naming**: CLI MCP tools MUST use the `zygo_` prefix (e.g., `zygo_list_entries`, `zygo_create_entry`, `zygo_update_entry`).
- **Return Structured Content**: All MCP tool handlers must return `{ toolResult: ..., content: [{ type: "text", text: ... }] }` with informative human/agent readable text.
- **Strict Input Schemas**: Every tool must define strict input JSON schemas and descriptive error messages for validation failures.
- **Dry-Run & Confirmation**: Destructive tools (deletions, publishing live content) must accept an optional `dry_run: boolean` flag or require confirmation.
- **Integration Tests**: Include Vitest tests validating that features can be queried and mutated via `zygo-mcp`.
