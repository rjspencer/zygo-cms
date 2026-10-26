# Admin UI Frontend Guidelines

Skills: `react-code`, `refactor-react-component-into-module`, `react-testing-library`, `webmcp-parity-audit`, `ui-qa-handoff`.

## 1. UI Component Development & Storybook (1+2+4 Protocol)
- **Component Isolation**: When adding or updating visual components, create a corresponding Storybook file (`.stories.tsx`) in the same directory or alongside existing stories.
- **Storybook Validation**: Test components against Storybook interactions (`pnpm run test-storybook` or Vitest storybook workspace).
- **QA Signoff**: Ensure changes conform to the `.agents/skills/ui-qa-handoff` 1+2+4 UI QA workflow before committing.
- **Scrollable Radix `<Card>` Lists**: Radix `<Card>` defaults to `flex-shrink: 1` with `overflow: hidden`. Never place `<Card>` items directly inside `<Flex direction="column" style={{ maxHeight: '...', overflowY: 'auto' }}>` without `style={{ flexShrink: 0 }}` on each `<Card>` and wrapping the `<Flex>` in a block `<Box style={{ maxHeight: '...', overflowY: 'auto' }}>`, or Flexbox will vertically squish and clip card contents.

## 2. API Data Fetching & Caching
- **React Query**: Use `@tanstack/react-query` for all API data fetching, caching, and state management.
- **Stale-While-Revalidate**: Implement a stale-while-revalidate strategy so pages load instantly from cache while fetching fresh data in the background.
- **Query Keys**: Structure query keys logically (e.g., `['entries', { type: 'post' }]`) to enable predictable invalidation.
- **Mutations**: Use React Query mutations for POST/PUT/DELETE requests. Always invalidate relevant queries on success to keep UI synchronized.
- **API Helper**: Use `apiFetch` from `utils/api.ts` within React Query fetcher functions to ensure proper authentication and base URL resolution.

## 3. Testing Strategy
- **Frameworks**: Vitest alongside `@testing-library/react`.
- **Portable Assertions (Avoid `jest-dom` Matchers in `.test.tsx`)**: Because root `pnpm run test:all` uses the root `vitest.config.js` without `packages/admin-ui/src/test/setup.ts`, prefer standard Vitest/Chai assertions (`.toBeDefined()`, `.toBeNull()`, `expect(btn.hasAttribute('disabled')).toBe(true)`) over `@testing-library/jest-dom` matchers (`.toBeInTheDocument()`, `.toBeDisabled()`) in unit tests (`*.test.tsx`).
- **HappyDOM Browser API Mocking**: Properties like `navigator.clipboard` are getter-only in HappyDOM (`Object.assign(navigator, { clipboard })` throws a `TypeError`). Always mock getter-only globals with `Object.defineProperty(navigator, 'clipboard', { value: { ... }, configurable: true })`.
- **Integration Tests**: Focus heavily on integration tests. Render pages with necessary providers (such as `QueryClientProvider` and `createMemoryRouter` from `src/test/test-utils.tsx`).
- **Data Routers**: When testing components using `useBlocker` or navigation blockers, use `createMemoryRouter` + `RouterProvider` instead of standard `MemoryRouter`.
- **API Mocking**: Use Mock Service Worker (MSW) or stub the `apiFetch` layer to mock network requests. Do not mock internal React Query hooks.
- **Accessibility**: Use Testing Library's `getByRole` and `getByLabelText` to guarantee accessible semantics. Avoid `getByTestId` unless no accessible role exists.

## 4. Pre-Commit Verification
- Run typecheck: `pnpm --filter admin-ui exec tsc --noEmit`
- Run targeted UI unit tests (from workspace root): `pnpm exec vitest run packages/admin-ui/src/components/<Name>/<Name>.test.tsx` (or `src/pages/<Name>/<Name>.test.tsx`)
- Run full test suite: `pnpm run test:all`

## 5. WebMCP & CLI MCP Tool Registration Guidelines
- WebMCP and CLI MCP tool registration guidelines have moved to the `webmcp-parity-audit` skill.
- See [`.agents/skills/webmcp-parity-audit/SKILL.md`](/.agents/skills/webmcp-parity-audit/SKILL.md) for full guidelines, checklists, and verification requirements.
- Run `node .agents/skills/webmcp-parity-audit/scripts/audit-webmcp.mjs` to audit tool definitions and editor parity across the codebase.
