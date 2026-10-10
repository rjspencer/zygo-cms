---
name: commit
description: >-
  Pre-commit validation, branch management, phased committing, and PR description generation.
  Use whenever committing changes, preparing commits, validating pre-commit quality gates,
  or completing a task and preparing a Pull Request.
---

# Commit Workflow & Pre-Commit Quality Gates

This skill defines the standard procedure for preparing, validating, and committing changes in Zygo CMS, as well as generating pull request descriptions upon task completion.

Every commit must be able to pass CI. Never commit broken builds, failing tests, or unvalidated code.

---

## 1. Branch Verification & Creation

Before making any commit, ensure a dedicated topic/feature branch exists for the current chat or task.

1. **Check current branch**:
   ```bash
   git branch --show-current
   ```
2. **Branch check rule**:
   - If currently on `main` (or the default base branch), or if a dedicated branch has not yet been created for this chat/task, create and switch to a new branch **before** staging or committing:
     ```bash
     git checkout -b <type>/<short-description>
     ```
     Branch naming conventions:
     - `feature/<name>` or `feat/<name>` for new features
     - `fix/<name>` for bug fixes
     - `chore/<name>` for tooling, skills, refactors, dependencies, maintenance
     - `docs/<name>` for documentation updates
3. **Only commit after ensuring a branch has been made for this commit.**

---

## 2. Pre-Commit Validation Gates (Mandatory)

Before creating any commit, execute and pass all validation gates across the whole project in order. Every commit MUST pass CI.

### Step-by-Step Validation Commands

1. **Rust Tests**:
   Verify core logic, database models, and worker handlers:
   ```bash
   cargo test
   ```
2. **Web Tests**:
   Run the Vitest test suites across the workspace:
   ```bash
   pnpm run test:all
   ```
3. **TypeScript Typecheck**:
   Verify type safety in the Admin UI:
   ```bash
   pnpm --filter admin-ui exec tsc --noEmit
   ```
4. **Production Build Verification**:
   Confirm all Rust Wasm workers and the React Admin UI compile without errors:
   ```bash
   pnpm run build
   ```
5. **UI QA Gate (if UI was touched)**:
   If any visual UI components in `packages/admin-ui` were added or modified:
   - Run Storybook automated tests:
     ```bash
     pnpm --filter admin-ui test-storybook
     ```
   - Ensure the **1+2+4 Protocol** is satisfied (Build story, Automate tests, UI QA inspection, Vision validation).

If any check fails, resolve the issue before proceeding. Do NOT commit with failing checks or use git flags to bypass hooks (`--no-verify`).

---

## 3. Build & CI Configuration Synchronization

If any changes were made to:
- Package scripts or dependencies (`package.json`, `pnpm-workspace.yaml`, `Cargo.toml`)
- Build toolchains, targets, or commands (`worker-build`, `wasm-pack`, Vite config)
- Environment variables or configurations

**You MUST verify and update CI workflows**:
- Check `.github/workflows/deploy.yml` (and any other workflow in `.github/workflows/`).
- Ensure CI install, test, and build steps accurately reflect project build changes.
- Ensure every commit will successfully pass remote CI.

---

## 4. Phased Commits

When work involves multiple components or phases:
- Create separate, focused commits for each phase rather than one massive diff.
- Examples of phases:
  - Phase 1: Core models / D1 migrations / shared schemas
  - Phase 2: Worker API endpoints / handlers
  - Phase 3: Admin UI components / hooks
  - Phase 4: Tests, documentation, and CI workflows
- **Requirement for Phased Commits**: Each individual commit must compile and pass all quality gates independently so that `git bisect` and CI remain green throughout the commit history.
- Use Conventional Commits formatting:
  - `feat(<scope>): <description>`
  - `fix(<scope>): <description>`
  - `chore(<scope>): <description>`
  - `docs(<scope>): <description>`
  - `test(<scope>): <description>`
  - `refactor(<scope>): <description>`

---

## 5. Pull Request Description

When all work for the task/chat is completed, provide a copy/pastable Markdown description for the Pull Request.

Use the following template:

```markdown
## Summary
<!-- Concise 1-3 bullet points or brief paragraph describing what changed and why -->
- 

## Changes Made
<!-- Detailed breakdown of changes by area/package -->
- **<package/module>**: <detail>

## CI & Build Verification
- [x] Rust tests passed (`cargo test`)
- [x] Web tests passed (`pnpm run test:all`)
- [x] TypeScript typecheck passed (`pnpm --filter admin-ui exec tsc --noEmit`)
- [x] Production build passed (`pnpm run build`)
- [x] CI workflow configurations verified / updated (if build changes made)
- [x] UI QA 1+2+4 Protocol verified (if UI components modified)

## Testing Instructions
<!-- How to test or verify these changes locally -->
```
