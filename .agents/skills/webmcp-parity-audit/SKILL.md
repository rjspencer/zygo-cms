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

## 2. WebMCP Editor Parity Checklist

When building or auditing an editor in `packages/admin-ui`, verify all five pillars:

1. **Read State & Schemas**:
   - Can an agent read the active editor buffer, metadata, and available templates/schemas in a single tool call (e.g., `editor_get_content`, `editor_get_section_templates`, `template_get_active`, `theme_get_active_tokens`)?
2. **Collection & Field Mutations**:
   - Can an agent add, update, reorder, remove, and batch-replace structured sub-collections (e.g., Page Sections via `editor_add_section` / `editor_set_sections`, Schema Fields, Menu Items) without clicking dropdown portals or form inputs?
3. **Full Metadata Setters**:
   - Can an agent update all metadata fields (title, slug, status, description, category, tags, cover image, canonical URL, schema JSON, parent ID, sort order) via a dedicated tool?
4. **Native Save / Publish Trigger**:
   - Is the editor's native save/publish handler wired into a WebMCP tool (e.g., `editor_save_draft`, `editor_publish`) so saving via WebMCP resets the unsaved-changes blocker (`isDirty`)?
5. **Same-Tick Batch Mutation Safety**:
   - When a `use*WebMCP` hook reads state via `optionsRef.current`, does every mutation handler synchronously update `optionsRef.current.<field> = nextValue` immediately after calling `opts.set<Field>(nextValue)`? This guarantees sequential tool calls in the same React render tick (such as batch calls in the `RPC Console`) do not overwrite each other with stale state.
