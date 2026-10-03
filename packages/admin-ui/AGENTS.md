# Admin UI Frontend Guidelines

## API Data Fetching & Caching
- **React Query:** Use `@tanstack/react-query` for all API data fetching, caching, and state management.
- **Stale-While-Revalidate:** Implement a stale-while-revalidate strategy to ensure pages load instantly from the cache while fetching fresh data in the background.
- **Query Keys:** Structure query keys logically (e.g., `['entries', { type: 'post' }]`) to allow easy invalidation.
- **Mutations:** Use React Query mutations for POST/PUT/DELETE requests. Always invalidate relevant queries on success to refresh the UI automatically.
- **API Helper:** Continue using `apiFetch` from `utils/api.ts` within React Query fetcher functions to ensure proper authentication and base URL resolution.

## Testing Strategy
- **Frameworks:** Use Vitest alongside `@testing-library/react`.
- **Integration Tests:** Focus heavily on integration tests. Rather than testing isolated components, test whole pages and complex interactions by rendering them with their necessary providers (like `QueryClientProvider`).
- **API Mocking:** Use tools like Mock Service Worker (MSW) or stub the `apiFetch` layer to mock network requests. Avoid mocking internal React Query hooks.
- **Accessibility:** Use Testing Library's `getByRole` and `getByLabelText` to ensure the UI is accessible. Avoid `getByTestId` unless absolutely necessary.
