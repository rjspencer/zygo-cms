# WebMCP in Admin Panel: In-Browser Agent Architecture & Roadmap

## 1. Executive Summary & Why We Are Doing This

Zygo CMS already provides a backend CLI bridge ([`packages/zygo-mcp`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/zygo-mcp/index.mjs)) connecting external desktop agents to the CMS REST API via Cloudflare Access service tokens. While effective for headless scripting, this model has fundamental limitations when collaborating with humans in the Admin UI:

### The Limitations of Backend-Only MCP
1. **Blind Writes (No Human-in-the-Loop)**: When an agent updates a post or template via REST, it writes directly to D1. A human working in the Admin UI gets no live updates, cursor awareness, or visual diffs—frequently resulting in dirty-state overwrites or lost work.
2. **Missing In-Memory State**: The backend knows nothing about the user's currently focused editor, uncommitted form inputs, active selections, or unsaved drafts.
3. **Disconnected Client Validations**: The admin panel uses client-side WebAssembly ([`templateWasmWorker.ts`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/src/workers/templateWasmWorker.ts)) for instantaneous MiniJinja template previews and syntax validation. A backend agent cannot access this live validation pipeline before persisting code.
4. **Credential Friction**: Backend agents require manual provisioning, copying, and rotating of Cloudflare Access service tokens (`CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`).

### The Solution: WebMCP Inside the Admin Panel
Running an in-browser MCP server directly inside the Single Page Application (`packages/admin-ui`) enables agents to co-author content alongside human operators:
- **Zero-Token Auth**: Automatically inherits the authenticated browser session and Cloudflare Access cookies.
- **Live Active-Context Awareness**: Agents know what route the user is viewing and can read/mutate the active TipTap editor or template code buffer in real time.
- **Client-Side Wasm Validation**: Agents can test MiniJinja syntax and render live preview layouts using Zygo's browser Wasm worker before saving.
- **Human-Agent Parity**: Every action a human can perform in the UI—from formatting text to tweaking theme CSS variables—is exposed as a first-class MCP tool.

---

## 2. Architecture & Design

### In-Browser MCP Server Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Admin UI (packages/admin-ui)                          │
│                                                                             │
│  ┌───────────────────────┐                    ┌──────────────────────────┐  │
│  │   Agent Transport     │                    │    In-Browser WebMCP     │  │
│  │ • Embedded AI Drawer  │◄── MessagePort ───►│       Server Host        │  │
│  │ • Extension Bridge    │   or WebSocket     │ (@modelcontextprotocol/  │  │
│  │ • Local Relay         │                    │           sdk)           │  │
│  └───────────────────────┘                    └────────────┬─────────────┘  │
│                                                            │                │
│                            ┌───────────────────────────────┴──────────────┐ │
│                            ▼                                              ▼ │
│              ┌───────────────────────────┐                  ┌─────────────┐ │
│              │ Dynamic Component Registry│                  │ Global Core │ │
│              │ (Contextual Page Tools)   │                  │ Tools       │ │
│              └─────────────┬─────────────┘                  └──────┬──────┘ │
│                            │                                       │        │
│        ┌───────────────────┼───────────────────┐                   │        │
│        ▼                   ▼                   ▼                   ▼        │
│  ┌───────────┐       ┌───────────┐       ┌───────────┐       ┌────────────┐ │
│  │  TipTap   │       │ Template  │       │   Theme   │       │ Navigation │ │
│  │  Editor   │       │  & Wasm   │       │  Editor   │       │  & Global  │ │
│  │ (Posts /  │       │ (MiniJinja│       │  (Tokens  │       │  API Fetch │ │
│  │  Pages)   │       │  Preview) │       │   / CSS)  │       │ (REST / D1)│ │
│  └───────────┘       └───────────┘       └───────────┘       └────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Architectural Decisions

1. **Dynamic Tool Registry via React Context**:
   - A `<WebMCPProvider>` manages the server instance.
   - Pages and active editor components hook into the registry via `useRegisterWebMCPTools(...)`.
   - When a user navigates to `/entries/123`, the TipTap editor registers active document tools (`editor_get_selection`, `editor_insert_content`). When navigating away, those transient tools unmount, preventing stale state execution.
2. **Global Foundation Tools Always Available**:
   - Navigation (`navigate_to`), resource querying (`list_entries`, `list_templates`, `get_system_status`), and data mutations execute via the standard `apiFetch` client using the browser's current credentials.
3. **Transport Layer Flexibility**:
   - **Primary (In-App)**: A built-in Assistant Drawer inside the Admin UI communicating over `MessageChannel` / `WebWorker`.
   - **Secondary (External Agent)**: A lightweight loopback WebSocket bridge allowing external desktop agents (Claude Desktop, Cursor, local CLI) to connect directly to the active browser tab.
4. **Staged Changes & Visual Diffing**:
   - Agent operations that perform destructive updates or bulk changes support a `dry_run: true` mode or stage changes into a visual diff dialog before saving.

---

## 3. Git Worktree & Execution Strategy

### Can we do this work in a Git Worktree?
**Yes.** In fact, using a dedicated git worktree is the strongly recommended approach for WebMCP development because:
1. **Isolated Dependency & Build State**: Adding `@modelcontextprotocol/sdk` to `packages/admin-ui` and testing Vite build outputs happens on an isolated branch (`feat/webmcp-admin-panel`) without dirtying `main`.
2. **Parallel Subagent Execution**: Subagents invoked with `Workspace: "share"` or `Workspace: "inherit"` can operate within the worktree path without locking or conflicting with root repository files.
3. **Zero Risk to Production Workers**: Cloudflare worker bindings and root lockfiles remain untouched until the full validation suite passes.

### Worktree Setup Workflow
```bash
# 1. Ensure .worktrees/ is ignored in the root repository
echo "\n# Local Git Worktrees\n.worktrees/\n" >> .gitignore

# 2. Add an isolated worktree inside .worktrees/
git worktree add .worktrees/webmcp -b feat/webmcp-admin-panel

# 3. All commands, installs, subagent tasks, and Vitest runs execute in:
cd .worktrees/webmcp
pnpm install
```

When work is validated across all quality gates, the branch is merged or pushed for PR review:
```bash
git push origin feat/webmcp-admin-panel
# Clean up worktree when done
git worktree remove .worktrees/webmcp
```

---

## 4. Subagent Handoff Matrix

To adhere strictly to Zygo CMS project standards ([`AGENTS.md`](file:///Users/ryan/Code/zygodactyl/zygo-cms/AGENTS.md)), all work across each phase is divided between specialized subagent roles with structured handoffs.

| Role | Target Area | Responsibility & Gates |
|---|---|---|
| **Feature Developer Agent** (`self`) | Code implementation | Writes TypeScript code, React hooks, MCP tool handlers, and initial Vitest tests. |
| **Code Review Subagent** (`self` configured as Reviewer) | Backend logic, MCP contracts, types | Inspects tool schemas, error handling, ensures explicit column/null bindings, verifies `pnpm --filter admin-ui exec tsc --noEmit` and `pnpm run test:all`. |
| **UI QA Subagent** (`ui-qa`) | Visual UI components (Drawer, Diff Modal, Storybook) | **1+2+4 Protocol**: Launches Storybook, validates automated Playwright tests, captures visual screenshots, inspects z-index/dialog collisions, and gives formal QA signoff. |

### The Subagent Handoff Protocol
```
┌──────────────────────────────────────┐
│  Phase Implementation (Dev Agent)    │
│  • Write code, tools, unit tests     │
└──────────────────┬───────────────────┘
                   │
                   ▼ Handoff 1: Code Review Gate
┌──────────────────────────────────────┐
│  Code Review Subagent                │
│  • Verify schemas & input validation │
│  • Run tsc --noEmit & Vitest suite   │
│  • Check memory leak / unmount clean │
└──────────────────┬───────────────────┘
                   │
                   ▼ (If UI component touched) Handoff 2: 1+2+4 UI QA Gate
┌──────────────────────────────────────┐
│  UI QA Subagent (1+2+4 Protocol)     │
│  • Storybook build & auto-runner     │
│  • Visual rendering & interaction QA │
│  • Responsive & accessible checks    │
└──────────────────┬───────────────────┘
                   │
                   ▼ Handoff 3: Phase Signoff
┌──────────────────────────────────────┐
│  Gate Approval -> Next Phase Unlocked│
└──────────────────────────────────────┘
```

---

## 5. Phased Implementation Roadmap & Checklists

This roadmap tracks progress section-by-section. No phase proceeds to completion without passing its designated subagent review handoffs.

---

### Phase 1: Core WebMCP Foundation & Transport
*Goal: Establish the in-browser MCP server runtime, React provider, dynamic tool registry, and test harness in the worktree.*

- [x] **1.1 Worktree & Environment Setup**:
  - [x] Add `.worktrees/` to `.gitignore`.
  - [x] Initialize worktree `.worktrees/webmcp` on branch `feat/webmcp-admin-panel`.
- [x] **1.2 Dependency Setup**:
  - [x] Install `@modelcontextprotocol/sdk` in `packages/admin-ui`.
  - [x] Verify Vite 6 / React 19 bundle compatibility.
- [x] **1.3 In-Browser Server Host**:
  - [x] Implement `src/lib/webmcp/server.ts` with standard Server lifecycle.
- [x] **1.4 Dynamic Tool & Resource Registry**:
  - [x] Implement `src/lib/webmcp/registry.ts` allowing React components to register/unregister tools on mount/unmount.
- [x] **1.5 React Context & Provider**:
  - [x] Implement `<WebMCPProvider>` in `src/providers/WebMCPProvider.tsx` and integrate into `App.tsx`.
- [x] **1.6 Global Foundation Tools**:
  - [x] `navigate_to({ path: string })`: Programmatically navigate React Router.
  - [x] `get_current_view()`: Return current route, active entity ID, and UI state.
  - [x] `get_system_info()`: Return CMS version, active user info, and configuration.
- [x] **1.7 Transport Harness**:
  - [x] Implement `MessagePortTransport` for in-app client testing and embedded drawer.
  - [x] Implement optional local WebSocket transport for external desktop agent connection.
- [x] **1.8 Testing & Verification**:
  - [x] Unit tests for tool registration and unmount cleanup.
  - [x] Integration test using an in-memory MCP Client interacting with the server.
- [x] **1.9 Subagent Handoff ➔ Code Review**:
  - [x] Delegate review to Code Review Subagent to inspect MCP lifecycle, error boundaries, and typecheck (`tsc --noEmit`).

---

### Phase 2: Documents & Content Editing (Posts & Pages)
*Goal: Give agents full capability to inspect, draft, edit, and publish posts and pages in parity with a human author.*

- [x] **2.1 Global Entry Tools**:
  - [x] `list_entries({ type?: 'post' | 'page', status?: 'draft' | 'published', search?: string })`
  - [x] `get_entry({ id: string })`
  - [x] `create_entry({ title, slug, type, status, ... })`
  - [x] `delete_entry({ id: string })`
- [x] **2.2 Active TipTap Editor Hook**:
  - [x] Expose `useTipTapWebMCP(editorInstance)` inside `PostEditor.tsx` / `PageEditor.tsx` (`Editor.tsx`).
- [x] **2.3 Active Document Inspection**:
  - [x] `editor_get_content({ format: 'html' | 'json' | 'markdown' })`: Return live unsaved editor content.
  - [x] `editor_get_selection()`: Return current text selection and cursor position.
- [x] **2.4 Active Document Mutations**:
  - [x] `editor_insert_content({ content: string, format: 'html' | 'markdown', position?: 'cursor' | 'start' | 'end' })`
  - [x] `editor_replace_selection({ content: string })`
  - [x] `editor_set_metadata({ title?: string, slug?: string, description?: string, tags?: string[] })`
- [x] **2.5 Editor Action Tools**:
  - [x] `editor_save_draft()`: Triggers form save mutation without publishing.
  - [x] `editor_publish()`: Triggers publish mutation.
- [x] **2.6 Testing & Verification**:
  - [x] Vitest integration tests verifying TipTap updates when tools are invoked.
  - [x] Storybook story demonstrating agent-driven content insertion in TipTap.
- [x] **2.7 Subagent Handoff ➔ Code Review**:
  - [x] Review TipTap transaction safety, JSON vs HTML schema sanitization, and regression test suite.

---

### Phase 3: Section Templates & Schemas (MiniJinja + Wasm)
*Goal: Allow agents to build, modify, test, and validate custom section templates, field schemas, and layouts.*

- [x] **3.1 Global Template Tools**:
  - [x] `list_section_templates()`: Return all templates with locked status and usage counts.
  - [x] `get_section_template({ id: string })`: Fetch template HTML, CSS, and `schema_json`.
  - [x] `delete_section_template({ id: string })`: Safe delete checking page usages.
- [x] **3.2 Active Template Editor Hook**:
  - [x] Expose `useTemplateEditorWebMCP(...)` in `TemplateEditor.tsx` / `TemplatesList.tsx`.
- [x] **3.3 Template Code & Schema Mutations**:
  - [x] `template_update_markup({ template_html: string })`: Update MiniJinja HTML in active buffer.
  - [x] `template_update_styles({ template_css: string })`: Update CSS in active buffer.
  - [x] `template_update_schema({ schema_json: string })`: Update field definitions (text, image, list, etc.).
- [x] **3.4 Live Wasm Validation & Preview**:
  - [x] `template_validate_syntax()`: Run template through the server/client MiniJinja validator, returning syntax errors.
  - [x] `template_render_preview({ dummy_data_json: string })`: Execute `templateWasmWorker.ts` and return rendered HTML output.
- [x] **3.5 Testing & Verification**:
  - [x] Vitest test verifying Wasm preview execution triggered via WebMCP tool call.
  - [x] Validation check ensuring invalid MiniJinja syntax returns descriptive tool errors to the agent.
- [x] **3.6 Subagent Handoff ➔ Code Review**:
  - [x] Review Wasm worker thread messaging safety and schema validation rules.

---

### Phase 4: Themes, Styles, Menus & Media
*Goal: Enable agents to adjust design tokens, color schemes, navigation menus, and media assets.*

- [x] **4.1 Theme Editor Tools**:
  - [x] `get_theme_settings()`: Return active color palette, typography presets, border radius, and CSS variables.
  - [x] `update_theme_settings({ settings: ThemeSettings, dry_run?: boolean })`: Update live theme tokens with instant preview update.
  - [x] `reset_theme_to_defaults()`
- [x] **4.2 Navigation Menu Tools**:
  - [x] `get_menu({ slug: string })`
  - [x] `update_menu_items({ slug: string, items: MenuItem[] })`
- [x] **4.3 Media Library Tools**:
  - [x] `list_media({ page?: number, limit?: number, query?: string })`
  - [x] `get_media_details({ id: string })`
  - [x] `update_media_metadata({ id: string, alt_text: string, title?: string })`
- [x] **4.4 Testing & Stories**:
  - [x] Vitest tests for Theme and Menu tool calls.
  - [x] Storybook story for live theme adjustments via MCP.
- [x] **4.5 Subagent Handoff ➔ UI QA Subagent (1+2+4 Protocol)**:
  - [x] Test Storybook runner (`test-storybook`).
  - [x] `ui-qa` visual review of theme variable live-updates in iframe preview.

---

### Phase 5: Human-in-the-Loop Controls & UI Experience
*Goal: Provide visual feedback, staged diff reviews, and permission safeguards for human operators.*

- [x] **5.1 Assistant Drawer Component**:
  - [x] Build `<WebMCPAssistantDrawer>` in `packages/admin-ui/src/components/assistant/`.
  - [x] Displays live tool activity, recent actions, and connection status indicator.
- [x] **5.2 Proposed Changes Diff Modal**:
  - [x] Component `<StagedDiffModal>` showing side-by-side text/HTML diffs before destructive saves.
  - [x] Human "Accept Changes" or "Reject Changes" interactive buttons.
- [x] **5.3 Connection & Permission Settings**:
  - [x] Setting to toggle external WebSocket bridge on/off.
  - [x] Permission prompts for sensitive actions (publishing, deleting content, database reset).
- [x] **5.4 Testing & Storybook Suite**:
  - [x] Build Storybook stories for Drawer, Status Indicator, and Diff Modal.
  - [x] Run automated Storybook interaction tests (`test-storybook`).
- [x] **5.5 Subagent Handoff ➔ UI QA Subagent (1+2+4 Protocol)**:
  - [x] Vision validation for drawer responsiveness, modal z-index layering, keyboard accessibility, and focus traps. Commit blocked until approved.

---

## 6. AGENTS.md Update & Parity Policy

To ensure that future development does not create a capability gap between human UI features and agent toolsets, the project guidelines in [`AGENTS.md`](file:///Users/ryan/Code/zygodactyl/zygo-cms/AGENTS.md) and [`packages/admin-ui/AGENTS.md`](file:///Users/ryan/Code/zygodactyl/zygo-cms/packages/admin-ui/AGENTS.md) must be updated with the **Human-Agent Parity Policy**.

### Policy: The Human-Agent Parity Mandate

> **Rule**: Whenever any developer or agent introduces or modifies a visual interface, workflow, or mutation in `packages/admin-ui`, they **MUST** evaluate and update the corresponding WebMCP toolset. No feature is considered complete if a human can perform an action that an agent has no WebMCP tool to execute or inspect.

### Specific Changes to Add to Root `AGENTS.md`
Add a dedicated section under `## 2. Subagent Workflows`:

```markdown
### WebMCP & Human-Agent Parity Gate (Mandatory for Admin UI)
For any feature added or changed in `packages/admin-ui`:
1. **Tool Parity Check**: Ask: "Can an AI agent perform this action via WebMCP?"
   - If adding a new page, register route navigation and inspection tools.
   - If adding an editor (text, template, theme, menu), register `useRegisterWebMCPTools` with corresponding getters, setters, and action hooks.
2. **Schema & Typings**: Every new tool must define strict input JSON schemas and descriptive error messages.
3. **Integration Test**: Include at least one Vitest integration test validating that the new feature can be queried and mutated via the WebMCP registry.
4. **Subagent Handoff**: Every feature PR must pass Code Review and UI QA (if visual) before merge.
```

### Specific Changes to Add to `packages/admin-ui/AGENTS.md`
Add a dedicated section:

```markdown
## 5. WebMCP Tool Registration Guidelines
- **Component-Level Tools**: When creating or editing complex view components (e.g. `PostEditor`, `TemplateEditor`, `ThemeEditor`), invoke `useRegisterWebMCPTools` to register active tools on mount and clean them up on unmount.
- **Naming Conventions**:
  - Active editor tools MUST use prefix `editor_` (e.g. `editor_insert_content`, `editor_get_selection`).
  - Template tools MUST use prefix `template_` (e.g. `template_update_markup`, `template_render_preview`).
  - Theme tools MUST use prefix `theme_` (e.g. `theme_update_tokens`).
  - Global CRUD tools MUST use resource prefix (e.g. `entries_list`, `entries_create`).
- **Return Structured Content**: All WebMCP tool handlers must return `{ toolResult: ..., content: [{ type: "text", text: ... }] }` with informative human/agent readable text.
- **Dry-Run & Confirmation**: Destructive tools (deletions, publishing live content) must accept an optional `dry_run: boolean` flag or require human confirmation.
- **Subagent Handoff**: Ensure changes are handed off to the Code Review and UI QA subagents.
```

---

## 7. Summary & Next Steps

This plan establishes WebMCP through an isolated git worktree with dedicated subagent quality handoffs for every phase:
1. **Worktree Isolation**: Keep `main` pristine by executing in `.worktrees/webmcp`.
2. **Phased Build & Verification**: Implement Foundation ➔ Documents ➔ Templates ➔ Themes ➔ UI Controls.
3. **Subagent Quality Gates**: Code Review and UI QA subagents validate each phase before progressing.
