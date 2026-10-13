---
name: refactor-react-component-into-module
description: >-
  Refactor a flat or monolithic React component into a modular folder structure
  (component, test, storybook, types, index, hooks, components) matching Zygo CMS
  conventions. Scaffolds module files via script, migrates existing code, decomposes
  subcomponents and hooks, and enforces 'react-code' best practices.
argument-hint: '<ComponentName>'
---

# Refactoring React Components into Modules

This skill guides the end-to-end refactoring of monolithic or flat React components in `packages/admin-ui` into clean, colocated, modular folder structures patterned after [ThemeEditor](/packages/admin-ui/src/components/ThemeEditor).

> **Best Practices Reference**: Always consult and follow the [react-code skill](/.agents/skills/react-code/SKILL.md) for architectural guidelines, file length limits (<200 warning, <300 hard limit), single-component-per-file rules, custom hook isolation, and Storybook 1+2+4 verification protocols.

---

## 1. The Target Module Architecture

Every modularized component follows the colocation pattern established by [ThemeEditor](/packages/admin-ui/src/components/ThemeEditor):

```text
packages/admin-ui/src/components/<ComponentName>/
├── <ComponentName>.tsx          # Main component orchestrating view & composition
├── <ComponentName>.test.tsx     # Colocated Vitest & React Testing Library tests
├── <ComponentName>.stories.tsx  # Colocated Storybook stories (mandatory per 1+2+4 protocol)
├── types.ts                     # Props, state models, and component-specific interfaces
├── index.ts                     # Public API barrel export (preserves consumer imports)
├── components/                  # Local subcomponents extracted from parent
│   └── <SubComponent>/
│       └── <SubComponent>.tsx
└── hooks/                       # Extracted custom hooks (queries, state, effects, WebMCP)
    └── use<Feature>State.ts
```

### Why This Structure?
1. **Preserved Imports via `index.ts`**: External consumers importing `from '../components/Foo'` or `from '@/components/Foo'` resolve seamlessly to `Foo/index.ts` without breaking changes across the codebase.
2. **Colocation**: Tests, stories, subcomponents, and hooks live right next to the component they support rather than scattered across global `__tests__/` or `stories/` directories.
3. **Maintainability**: Keeps every file strictly under the 200-line soft limit (300-line hard limit).

---

## 2. Step 1: Scaffold Module Structure with the Script

Before touching code, run the scaffolding script to create the component module folder, empty main files, and subdirectories.

### Running the Script

From the workspace root, run:

```bash
# Using npm/pnpm script
pnpm run create:component <ComponentName>

# Or running the Node.js script directly
node scripts/create-component-module.mjs <ComponentName>

# Or using the bundled skill script
node .agents/skills/refactor-react-component-into-module/scripts/create-component-module.mjs <ComponentName>
```

### Examples

```bash
# Refactor an existing flat component
node scripts/create-component-module.mjs RichTextEditor

# Can also pass file path directly
node scripts/create-component-module.mjs packages/admin-ui/src/components/MediaPickerModal.tsx
```

### What the Script Creates
- `<ComponentName>/` directory
- `<ComponentName>/<ComponentName>.tsx` (empty)
- `<ComponentName>/<ComponentName>.test.tsx` (empty)
- `<ComponentName>/<ComponentName>.stories.tsx` (empty)
- `<ComponentName>/types.ts` (empty)
- `<ComponentName>/index.ts` (empty)
- `<ComponentName>/components/` (subcomponents directory)
- `<ComponentName>/hooks/` (custom hooks directory)

*(Files are left empty to provide a clean slate for code migration and decomposition).*

---

## 3. Step 2: Move and Migrate the Code

Once the directory structure is scaffolded, migrate the existing implementation into the module:

### 1. Transfer Component Code
- Move or copy the original component implementation from `src/components/<ComponentName>.tsx` into `<ComponentName>/<ComponentName>.tsx`.
- Delete the original flat `<ComponentName>.tsx` file once moved.

### 2. Colocate Tests
- Check if a unit test exists in `packages/admin-ui/src/__tests__/<ComponentName>.test.tsx` or adjacent to the old component.
- Move the test into `<ComponentName>/<ComponentName>.test.tsx`.
- Update relative import paths in the test file (e.g., `import { Foo } from '../components/Foo'` becomes `import { Foo } from './Foo'`).
- If no test previously existed, write comprehensive tests covering primary user interactions.

### 3. Colocate Storybook Stories
- Check if a story exists in `packages/admin-ui/src/stories/<ComponentName>.stories.tsx` or adjacent to the old component.
- Move the story file to `<ComponentName>/<ComponentName>.stories.tsx`.
- Update the story's component import to `./<ComponentName>`.
- If no story existed, create one with representative states per the **1+2+4 Protocol**.

---

## 4. Step 3: Configure Barrel Exports in `index.ts`

Set up the public API in `<ComponentName>/index.ts` so external consumers require zero import changes:

```typescript
export { <ComponentName>, default } from './<ComponentName>';
export type { <ComponentName>Props } from './types';
```

If the module exports common presets, constants, or utility helpers (similar to `ThemeEditor`), re-export them from `index.ts`:

```typescript
export * from './constants';
```

---

## 5. Step 4: Extract Types to `types.ts`

Extract all interfaces and types out of `<ComponentName>.tsx` into `types.ts`:

```typescript
// types.ts
export interface <ComponentName>Props {
  id?: string;
  initialValue?: string;
  onChange?: (val: string) => void;
  disabled?: boolean;
}

export interface <ComponentName>State {
  isOpen: boolean;
  selectedId: string | null;
}
```

In `<ComponentName>.tsx`, import the types:
```typescript
import type { <ComponentName>Props } from './types';
```

---

## 6. Step 5: Decompose Following 'react-code' Guidelines

Refer to the [react-code skill](/.agents/skills/react-code/SKILL.md) for detailed rules:

### A. Document Component Tree First
Always map the hierarchy tree before breaking up files:
```text
<ComponentName> -> Header, ContentBody, FooterModal
├── Header -> StatusBadge, ActionGroup
└── ContentBody -> ItemList, EmptyStateView
```

### B. Enforce Single Component Per File
- Search `<ComponentName>.tsx` for inline subcomponents (e.g., `const ItemRow = () => ...`, dialogs, headers, cards).
- Move each subcomponent into its own file under `<ComponentName>/components/<SubComponent>/<SubComponent>.tsx` or `<ComponentName>/components/<SubComponent>.tsx`.

### C. Extract Logic into Custom Hooks
- Identify `useState`, `useEffect`, React Query calls (`useQuery`, `useMutation`), and WebMCP registrations.
- Extract them into custom hooks under `<ComponentName>/hooks/` (e.g., `use<ComponentName>Data.ts`, `use<ComponentName>State.ts`).
- Ensure the main `<ComponentName>.tsx` focuses purely on composition, layout, and presentation.

### D. File Length Gate
- Target: `<ComponentName>.tsx` under 200 lines.
- Hard limit: No component file may exceed 300 lines.

---

## 7. Step 6: Fix Imports Across Workspace

1. Inside `<ComponentName>/`:
   - Change imports to relative paths (`./types`, `./hooks/...`, `./components/...`).
2. Outside `<ComponentName>/`:
   - Ensure existing files importing `from '../components/<ComponentName>'` still compile cleanly via `index.ts`.
   - If any files imported directly from `.../<ComponentName>.tsx`, update them to import from `.../<ComponentName>`.

---

## 8. Step 7: Pre-Commit Quality Gates Validation

Before completing the refactoring or committing, execute and pass all validation gates in order:

```bash
# 1. Typecheck Admin UI
pnpm --filter admin-ui exec tsc --noEmit

# 2. Run unit and integration tests
pnpm --filter admin-ui test

# 3. Verify Storybook tests (if Storybook runner configured)
pnpm --filter admin-ui test-storybook

# 4. Full monorepo build verification
pnpm run build

# 5. UI QA verification (1+2+4 Protocol)
# If visual UI changed, inspect rendered component in Storybook to ensure no regressions.
```

---

## Reference Examples

- **Gold Standard**: Inspect [packages/admin-ui/src/components/ThemeEditor/](/packages/admin-ui/src/components/ThemeEditor) for an existing, fully decomposed module implementation.
- **Architectural Rules**: Consult [react-code skill](/.agents/skills/react-code/SKILL.md) for standards on hooks, testing, accessibility, and WebMCP tool registration.
