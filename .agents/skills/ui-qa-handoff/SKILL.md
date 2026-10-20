---
name: ui-qa-handoff
description: Use whenever visual UI components in packages/admin-ui are added or changed, before commit.
---

# UI QA Handoff & Subagent Verification Workflow

## 1. The 1+2+4 Protocol (Frontend / UI Changes)
For ANY visual UI component changes in `packages/admin-ui`, strictly adhere to this four-step protocol:
1. **Build**: Build the React component and create a corresponding `.stories.tsx` file for Storybook.
2. **Automate**: Ensure the component passes Playwright tests via `@storybook/test-runner` or Vitest Storybook integration (`pnpm --filter admin-ui test-storybook`).
3. **Handoff**: Invoke a strict `ui-qa` Subagent (define via `define_subagent` or invoke `self` with an explicit UI QA prompt and browser tools if not registered). Provide it with the local Storybook URL (e.g., `http://localhost:6006/?path=/story/...`).
4. **Vision Validation**: The `ui-qa` Subagent MUST inspect the rendered component via browser tooling/screenshots, interact with states (hover, open dialogs, focus), and verify absence of visual regressions (e.g., clipped dropdowns, z-index collisions, overflowing text). The commit is blocked until approved.

## 2. Parallel Subagent Wave Pattern
When a task spans implementation, UI/Storybook, and tests, execute in three structured waves:
1. **Define Shared Contracts First**: Specify exact function signatures, tool names, JSON input schemas, accessible labels (`aria-label`), and `data-testid` attributes before spawning subagents.
2. **Wave 1 (Parallel Implementation & Test Authoring)**: Spawn implementation, UI/Storybook, and test subagents concurrently with **strictly disjoint file ownership** so no two subagents edit the same file.
3. **Wave 2 (Automated Quality Gates)**: Run `tsc --noEmit`, `pnpm run test:all`, `cargo test`, and `pnpm run build` to verify integration.
4. **Wave 3 (Parallel Verification Handoffs)**: Spawn the **Code Review Subagent** and **`ui-qa` Subagent** concurrently to verify code quality and 1+2+4 visual compliance.

## 3. Backend Workflow
For non-visual changes (Rust logic, D1 schema, REST APIs):
1. **Implementation**: Delegate feature implementation to a subagent or complete it cleanly.
2. **Verification Handoff**: Delegate verification to a Code Review Subagent (or invoke `self` configured as a Code Reviewer) to inspect logic, test coverage, and security before committing.
