# Admin UI Frontend Guidelines

## 1. UI Component Development & Storybook (1+2+4 Protocol)
- **Component Isolation**: When adding or updating visual components, create a corresponding Storybook file (`.stories.tsx`) in the same directory or alongside existing stories.
- **Storybook Validation**: Test components against Storybook interactions (`pnpm run test-storybook` or Vitest storybook workspace).
- **QA Signoff**: Ensure changes conform to the root `AGENTS.md` 1+2+4 UI QA workflow before committing.
- **Scrollable Radix `<Card>` Lists**: Radix `<Card>` defaults to `flex-shrink: 1` with `overflow: hidden`. Never place `<Card>` items directly inside `<Flex direction="column" style={{ maxHeight: '...', overflowY: 'auto' }}>` without `style={{ flexShrink: 0 }}` on each `<Card>` and wrapping the `<Flex>` in a block `<Box style={{ maxHeight: '...', overflowY: 'auto' }}>`, or Flexbox will vertically squish and clip card contents.

## 2. API Data Fetching & Caching
- **React Query**: Use `@tanstack/react-query` for all API data fetching, caching, and state management.
- **Stale-While-Revalidate**: Implement a stale-while-revalidate strategy so pages load instantly from cache while fetching fresh data in the background.
- **Query Keys**: Structure query keys logically (e.g., `['entries', { type: 'post' }]`) to enable predictable invalidation.
- **Mutations**: Use React Query mutations for POST/PUT/DELETE requests. Always invalidate relevant queries on success to keep UI synchronized.
- **API Helper**: Use `apiFetch` from `utils/api.ts` within React Query fetcher functions to ensure proper authentication and base URL resolution.

## 3. Testing Strategy
- **Frameworks**: Vitest alongside `@testing-library/react`.
- **Integration Tests**: Focus heavily on integration tests. Render pages with necessary providers (such as `QueryClientProvider` and `createMemoryRouter` from `src/test/test-utils.tsx`).
- **Data Routers**: When testing components using `useBlocker` or navigation blockers, use `createMemoryRouter` + `RouterProvider` instead of standard `MemoryRouter`.
- **API Mocking**: Use Mock Service Worker (MSW) or stub the `apiFetch` layer to mock network requests. Do not mock internal React Query hooks.
- **Accessibility**: Use Testing Library's `getByRole` and `getByLabelText` to guarantee accessible semantics. Avoid `getByTestId` unless no accessible role exists.

## 4. Pre-Commit Verification
- Run typecheck: `pnpm --filter admin-ui exec tsc --noEmit`
- Run targeted UI unit tests (from workspace root): `pnpm exec vitest run packages/admin-ui/src/__tests__/<File>.test.tsx`
- Run full test suite: `pnpm run test:all`

## 5. WebMCP Tool Registration Guidelines
- **Component-Level Tools**: When creating or editing complex view components (e.g. `Editor`, `TemplateEditor`, `ThemeEditor`), invoke `useRegisterWebMCPTools` to register active tools on mount and clean them up on unmount.
- **End-to-End Lifecycle Parity**: Every editor's WebMCP hook (`use*WebMCP`) must expose tools for the complete authoring lifecycle—not just primary text buffers:
  1. Reading active state & available schemas/templates.
  2. Mutating all sub-collections (e.g. Page Sections, Menu Items, Schema Fields) and metadata fields.
  3. Triggering the editor's native **Save / Publish** handler so unsaved-changes blockers (`isDirty`) reset properly.
- **Same-Tick Sequential Mutation Safety**: In `use*WebMCP` hooks using `optionsRef.current`, handlers that update arrays or objects via React state setters (`opts.setSections(next)`, etc.) MUST also synchronously update `optionsRef.current.<field> = next` so batch/sequential tool calls in the same React render tick do not read stale closure state.
- **Browser Global Synchronization**: All tools registered in `WebMCPRegistry` automatically sync to `window.webmcp` and `navigator.modelContext` (`registerTool`, `unregisterTool`, `provideContext`, `executeTool`). Preserve this synchronization when extending `registry.ts` or `WebMCPProvider.tsx`.
- **Naming Conventions**:
  - Active editor tools MUST use prefix `editor_` (e.g. `editor_insert_content`, `editor_get_selection`).
  - Template tools MUST use prefix `template_` (e.g. `template_update_markup`, `template_render_preview`).
  - Theme tools MUST use prefix `theme_` (e.g. `theme_update_live_tokens`).
  - Global CRUD tools MUST use resource naming (e.g. `list_entries`, `create_entry`, `list_section_templates`).
- **Return Structured Content**: All WebMCP tool handlers must return `{ toolResult: ..., content: [{ type: "text", text: ... }] }` with informative human/agent readable text.
- **Dry-Run & Confirmation**: Destructive tools (deletions, publishing live content) must accept an optional `dry_run: boolean` flag or require human confirmation.
- **Subagent Handoff**: Ensure changes are handed off to the Code Review and UI QA subagents.

