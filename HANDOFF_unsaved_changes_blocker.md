# Handoff: Unsaved-Changes Navigation Blocker

Branch: `fix/storybook-ts-errors`. **Nothing is committed.** All work is in the working tree under `packages/admin-ui/`.
Plan: `/Users/ryan/.gemini/antigravity/brain/558ad58b-3865-463c-8f03-80eb252c1781/implementation_plan.md`

## Goal
When a user has unsaved changes on Settings, Editor (posts/pages) or TemplateEditor and navigates away, show a Radix confirm dialog (Stay / Leave without saving). Also prompt on tab close/refresh via `beforeunload`.

## Done (implemented and passing)
- `src/hooks/useUnsavedChangesBlocker.ts`: wraps `useBlocker` (blocks only when `isDirty` and the pathname changes) and registers `beforeunload` while dirty. Returns `{ blocker, allowNextNavigation }`. `allowNextNavigation()` skips the blocker once, for the redirect after the first save of a new entry or template.
- `src/components/UnsavedChangesDialog.tsx`: Radix `AlertDialog` driven by a `Blocker` prop.
- `src/components/UnsavedChangesDialog.stories.tsx`: stories Blocked, LeaveWithoutSaving and Idle. They pass in the Storybook test runner.
- `src/main.tsx`: now `createBrowserRouter([{ path: '*', element: <ThemedApp /> }])` with `RouterProvider`. This is a data router, which `useBlocker` requires. `App.tsx` is unchanged and still uses descendant `<Routes>`.
- Pages wired:
  - `Settings.tsx` uses the existing `isDirty`.
  - `Editor.tsx` and `TemplateEditor.tsx` compare a JSON snapshot of the form fields against `savedSnapshot`. The snapshot is set on load and on save, and for new items it is the empty form at mount.
  - Editor "Preview" saves (`payload.draft_only`) deliberately do NOT clear dirty.
  - Both editors call `allowNextNavigation()` before the post-create `navigate(..., { replace: true })`.
- Tests:
  - `src/test/test-utils.tsx`: shared `createWrapper` using `createMemoryRouter`, with children passed via context so `rerender` works.
  - `Editor.test.tsx`, `TemplateEditor.test.tsx` and `Settings.test.tsx` were migrated from `MemoryRouter` to `createMemoryRouter` + `RouterProvider`.
  - New `src/__tests__/UnsavedChangesBlocker.test.tsx` covers clean navigation, Stay, Leave, and `beforeunload` (asserted via `event.defaultPrevented`). It only exercises Settings.
- `pnpm exec tsc --noEmit` is clean in `packages/admin-ui`.

## Remaining (in order)
1. **Add Editor and TemplateEditor blocker tests.** Neither has any yet. Cover:
   - editing a field then navigating shows the dialog;
   - a clean form is not blocked;
   - after a successful save, navigation is not blocked;
   - creating a new entry or template redirects without the dialog (the `allowNextNavigation` path).
2. **Pre-existing failures** (verified on a clean stash, unrelated to this work): 9 tests in `Dashboard.test.tsx` and `Analytics.test.tsx` fail with `Invalid Chai property: toBeInTheDocument`, so jest-dom matchers aren't registered for those files. Ask the user whether to fix them. `pnpm run test:all` will likely fail until they are fixed.
3. **UI QA gate** (AGENTS.md 1+2+4 protocol): the `ui-qa` subagent must open `http://localhost:6006/?path=/story/components-unsavedchangesdialog--blocked` in a headless browser, interact with it, and visually check it. Commit is blocked until it approves. The previous agent had no `ui-qa` subagent available, so define one if needed.
4. **Commit gates** (AGENTS.md): run `pnpm run test:all`, `cargo test` and `pnpm run build` from the repo root. All must pass before committing. Then ask the user before committing.

## Notes and gotchas
- The sandbox blocks `pnpm`, so use `BypassSandbox: true`. zsh needs quoted globs.
- The vitest workspace includes a Storybook browser project. The first run after adding a new story can fail with "Failed to fetch dynamically imported module" because of dependency re-optimization. Re-run to confirm.
- Radix dialogs animate in. In stories and tests, use `waitFor(() => expect(el).toBeVisible())`, not an immediate `toBeVisible`.
- `useBlocker` fails under `BrowserRouter` and `MemoryRouter`. Any new test that renders one of the three pages needs `createMemoryRouter`.
- The blocker ignores search-param-only changes, such as `?type=` on `/editor`. This is intentional.
- User rules: keep the code simple, add no extra features, and ask when unsure.
