# Admin UI Frontend Guidelines

## 1. UI Component Development & Storybook (1+2+4 Protocol)
- **Component Isolation**: When adding or updating visual components, create a corresponding Storybook file (`.stories.tsx`) in the same directory or alongside existing stories.
- **Storybook Validation**: Test components against Storybook interactions (`pnpm run test-storybook` or Vitest storybook workspace).
- **QA Signoff**: Ensure changes conform to the root `AGENTS.md` 1+2+4 UI QA workflow before committing.

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
- Run typecheck: `pnpm exec tsc --noEmit`
- Run UI tests: `pnpm run test`
