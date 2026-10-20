---
name: webmcp-parity-audit
description: >-
  Audits WebMCP tool registration, browser bridge exposure (window.webmcp and navigator.modelContext),
  and Human-Agent lifecycle parity across all Admin UI editors and pages. Use whenever adding,
  modifying, or reviewing Admin UI pages, editors, or WebMCP tools.
---

# WebMCP Parity Audit & Verification Skill

Use this skill whenever adding or modifying pages, editors, or WebMCP tools in `packages/admin-ui` to enforce the **WebMCP & Human-Agent Parity Gate**.

---

## 1. Automated Static Audit Script

Run the built-in static audit script to inspect all registered WebMCP tools and verify editor lifecycle parity across `packages/admin-ui`:

```bash
node .agents/skills/webmcp-parity-audit/scripts/audit-webmcp.mjs
```

### What the Script Checks
1. **Tool Inventory**: Scans `packages/admin-ui/src/lib/webmcp/*.ts` and `packages/admin-ui/src/providers/WebMCPProvider.tsx` for all tool definitions, required input schema fields, and prefixes (`editor_`, `template_`, `theme_`, global CRUD).
2. **Global Bridge Bindings**: Verifies `window.webmcp` and `navigator.modelContext` synchronization in `registry.ts` and `WebMCPProvider.tsx`.
3. **Editor Lifecycle Parity**: Scans every editor/page in `packages/admin-ui/src/pages/` and `packages/admin-ui/src/components/ThemeEditor/` to check whether components with save/mutation state (`handleSave` / `useMutation`) wire a corresponding WebMCP hook (`useTipTapWebMCP`, `useTemplateEditorWebMCP`, `useThemeEditorWebMCP`, `useRegisterWebMCPTools`) and expose save/metadata/collection callbacks.

---

## 2. WebMCP & CLI MCP Tool Registration Guidelines

- **Dual MCP Parity (`webmcp` + `zygo-mcp`)**: Whenever adding or modifying CMS features, global CRUD tools, or REST API contracts, update **both** in-browser WebMCP (`packages/admin-ui/src/lib/webmcp/`) and the backend CLI MCP server (`packages/zygo-mcp/index.mjs`). Both agents and humans must have parity.
- **Component-Level Tools**: When creating or editing complex view components (e.g. `Editor`, `TemplateEditor`, `ThemeEditor`), invoke `useRegisterWebMCPTools` to register active tools on mount and clean them up on unmount.
- **End-to-End Lifecycle Parity**: Every editor's WebMCP hook (`use*WebMCP`) must expose tools for the complete authoring lifecycle—not just primary text buffers:
  1. **Reading active state & schemas**: Return active buffer, metadata, and available templates/schemas in a single tool call (`editor_get_content`, `template_get_active`, `theme_get_active_tokens`).
  2. **Mutating all sub-collections & metadata**: Add, update, reorder, remove, and batch-replace structured sub-collections (e.g. Page Sections via `editor_add_section` / `editor_set_sections`, Menu Items, Schema Fields) and update all metadata fields without requiring dropdown portals or manual form inputs.
  3. **Triggering native Save / Publish handler**: Wire the editor's native save/publish handler into a WebMCP tool (e.g. `editor_save_draft`, `editor_publish`) so saving via WebMCP resets the unsaved-changes blocker (`isDirty`).
- **Same-Tick Sequential Mutation Safety**: In `use*WebMCP` hooks using `optionsRef.current`, handlers that update arrays or objects via React state setters (`opts.setSections(next)`, etc.) MUST also synchronously update `optionsRef.current.<field> = next` immediately after calling `opts.set<Field>(next)`. This guarantees sequential or batch tool calls in the same React render tick (such as in the RPC Console) do not read stale closure state or overwrite each other.
- **Browser Global Synchronization**: All tools registered in `WebMCPRegistry` automatically sync to `window.webmcp` and `navigator.modelContext` (`registerTool`, `unregisterTool`, `provideContext`, `executeTool`). Preserve this synchronization when extending `registry.ts` or `WebMCPProvider.tsx`.
- **Naming Conventions**:
  - Active editor tools MUST use prefix `editor_` (e.g. `editor_insert_content`, `editor_get_selection`).
  - Template tools MUST use prefix `template_` (e.g. `template_update_markup`, `template_render_preview`).
  - Theme tools MUST use prefix `theme_` (e.g. `theme_update_live_tokens`).
  - Global CRUD tools MUST use resource naming (e.g. `list_entries`, `create_entry`, `list_section_templates`) in WebMCP and `zygo_` prefix in `packages/zygo-mcp`.
- **Return Structured Content**: All MCP and WebMCP tool handlers must return `{ toolResult: ..., content: [{ type: "text", text: ... }] }` with informative human/agent readable text.
- **Dry-Run & Confirmation**: Destructive tools (deletions, publishing live content) must accept an optional `dry_run: boolean` flag or require human confirmation.
- **Subagent Handoff**: Ensure changes are handed off to the Code Review and UI QA subagents.

---

## 3. WebMCP Editor Parity Checklist

When building or auditing an editor in `packages/admin-ui`, verify each item:

- [ ] **Read State & Schemas**: Can an agent read the active editor buffer, metadata, and available templates/schemas in a single tool call?
- [ ] **Collection & Field Mutations**: Can an agent add, update, reorder, remove, and batch-replace structured sub-collections without clicking dropdown portals or form inputs?
- [ ] **Full Metadata Setters**: Can an agent update all metadata fields via a dedicated tool?
- [ ] **Native Save / Publish Trigger**: Does saving via WebMCP trigger the native save/publish handler and reset `isDirty`?
- [ ] **Same-Tick Batch Mutation Safety**: Does every mutation handler synchronously update `optionsRef.current.<field> = nextValue` alongside state setters?
- [ ] **Backend CLI MCP Parity**: Is `packages/zygo-mcp/index.mjs` updated in parity with WebMCP for all global CRUD and REST endpoint changes?
- [ ] **Prefixes & Return Schemas**: Are tools named with proper prefixes (`editor_`, `template_`, `theme_`, `zygo_`) and do handlers return structured content objects?
