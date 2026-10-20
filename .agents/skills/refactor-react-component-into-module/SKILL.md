---
name: refactor-react-component-into-module
description: >-
  Refactor a flat or monolithic React component into a modular folder structure
  (component, test, storybook, types, index, hooks, components) matching Zygo CMS
  conventions. Scaffolds module files via script, migrates existing code, decomposes
  subcomponents and hooks, reworks form useState to react-hook-form, migrates filter/sort
  state to React Router URL hooks, and enforces 'react-code' best practices.
argument-hint: '<ComponentName>'
---

# Refactoring React Components into Modules

Guides end-to-end refactoring of monolithic or flat React components in `packages/admin-ui` into clean, colocated, modular folder structures patterned after [ThemeEditor](/packages/admin-ui/src/components/ThemeEditor). Follow the [react-code skill](/.agents/skills/react-code/SKILL.md) for architectural guidelines, file length limits (<200 warning, <300 hard limit), single-component-per-file rules, and Storybook 1+2+4 verification.

### Key State Modernization Rules
- **Forms**: `react-hook-form` is preinstalled in `packages/admin-ui`. When refactoring a component with a form that uses `useState`, **rework it to use `react-hook-form` instead**.
- **URL-Driven State**: If the state tracks values that belong in the URL—such as **filter, sort, search, or pagination**—**use React Router hooks (`useSearchParams`) instead of `useState`**.

---

## 1. The Target Module Architecture

```text
packages/admin-ui/src/components/<ComponentName>/
├── <ComponentName>.tsx          # Main component orchestrating view & composition
├── <ComponentName>.test.tsx     # Colocated Vitest & React Testing Library tests
├── <ComponentName>.stories.tsx  # Colocated Storybook stories (mandatory per 1+2+4)
├── types.ts                     # Props, form schemas, filter models, component interfaces
├── index.ts                     # Public API barrel export (preserves consumer imports)
├── components/                  # Local subcomponents extracted from parent
│   └── <SubComponent>/<SubComponent>.tsx
└── hooks/                       # Extracted custom hooks (react-hook-form, React Router, queries, WebMCP)
    ├── use<ComponentName>Form.ts     # react-hook-form setup & submission
    ├── use<ComponentName>Filters.ts  # React Router useSearchParams for filter/sort
    └── use<ComponentName>Data.ts     # TanStack React Query hooks
```

- **Preserved Imports via `index.ts`**: External consumers importing `from '../components/Foo'` resolve seamlessly to `Foo/index.ts` without breaking changes.
- **Colocation**: Tests, stories, subcomponents, and hooks live right next to the component they support.
- **Maintainability**: Keeps every file strictly under the 200-line soft limit (300-line hard limit).

---

## 2. Step 1: Scaffold Module Structure with the Script

From the workspace root, run the scaffolding script to create the component module folder and files:

```bash
pnpm run create:component <ComponentName>
# Or: node scripts/create-component-module.mjs <ComponentName>
# Or: node .agents/skills/refactor-react-component-into-module/scripts/create-component-module.mjs <ComponentName>
```

Accepts component names (e.g. `RichTextEditor`) or direct file paths (e.g. `packages/admin-ui/src/components/MediaPickerModal.tsx`). Creates `<ComponentName>/` containing empty `.tsx`, `.test.tsx`, `.stories.tsx`, `types.ts`, `index.ts`, `components/`, and `hooks/`.

---

## 3. Step 2: Move and Migrate the Code

1. **Transfer Component Code**: Move implementation from `src/components/<ComponentName>.tsx` into `<ComponentName>/<ComponentName>.tsx`. Delete the original flat file.
2. **Colocate Tests**: Move unit tests to `<ComponentName>/<ComponentName>.test.tsx`. Update relative imports. Note relative path depth (`<ComponentName>.test.tsx` is 2 levels deep from `src/` -> `../../utils/api`; hooks are 3 levels deep -> `../../../utils/api`). Use portable Vitest assertions (`.toBeDefined()`, `.toBeNull()`, `btn.hasAttribute('disabled')`) rather than `jest-dom` matchers.
3. **Colocate Storybook Stories**: Move stories to `<ComponentName>/<ComponentName>.stories.tsx`. If none exist, create one per the 1+2+4 Protocol.
4. **Audit Existing State for Modernization**: Identify `useState` form variables to rework to `react-hook-form` and filter/sort/search states to migrate to `useSearchParams`.

---

## 4. Step 3: Configure Barrel Exports in `index.ts`

Set up the public API in `<ComponentName>/index.ts` so external consumers require zero import changes:

```typescript
export { <ComponentName>, default } from './<ComponentName>';
export type { <ComponentName>Props } from './types';
export * from './constants'; // If common presets or constants exist
```

---

## 5. Step 4: Extract Types to `types.ts`

Extract all interfaces and types out of `<ComponentName>.tsx` into `types.ts` (`<ComponentName>Props`, form schemas, filter params). In `<ComponentName>.tsx`, import types via `import type { ... } from './types'`. See [references/form-and-url-state.md](references/form-and-url-state.md#1-types-template-typests) for the template.

---

## 6. Step 5: Decompose Following 'react-code' Guidelines

Refer to the [react-code skill](/.agents/skills/react-code/SKILL.md) for detailed rules:

### A. Document Component Tree First
Always map the hierarchy tree before breaking up files (e.g., `<ComponentName>` -> Header, ContentBody, FooterModal).

### B. Enforce Single Component Per File
Move each subcomponent into its own file under `<ComponentName>/components/<SubComponent>/<SubComponent>.tsx`.

### C. Rework Form State to `react-hook-form`
`react-hook-form` is preinstalled in `packages/admin-ui`. Do not install alternatives or retain scattered `useState` form variables:
1. **Define Form Types**: Declare form schema in `types.ts` (`export interface <ComponentName>FormValues { ... }`).
2. **Initialize `useForm`**: Use `useForm<FormValues>({ defaultValues: ... })`.
3. **Register or Control Inputs**: For standard HTML inputs, use `register('fieldName')`. For Radix UI controlled components (`Select`, `Switch`, etc.), use `Controller` or `useController`.
4. **Subcomponent Access without Prop-Drilling**: Wrap form in `<FormProvider {...methods}>`. Extracted child fields consume via `useFormContext<FormValues>()` and `useWatch`.
5. **Extract Submit & Form Logic**: Place form setup, validation, and mutation triggers into a dedicated custom hook under `hooks/use<ComponentName>Form.ts`.

See [references/form-and-url-state.md](references/form-and-url-state.md#2-form-state-modernization-react-hook-form) for full before/after code.

### D. Synchronize URL-Driven State with React Router
State tracking filter, sort, search query, page number, or active view/tab belongs in URL search parameters:
1. **Never use `useState` for filter/sort**: Replace with `useSearchParams()` from `react-router-dom`.
2. **Extract to a Custom Hook**: Place search param parsing, serialization, and updaters in `hooks/use<ComponentName>Filters.ts`.
3. **Immutable Updates**: Preserve existing params by modifying a new `URLSearchParams(prev)` instance.
4. **Reset Page on Filter Change**: Whenever a search or filter changes, always reset pagination (`page = 1`).

See [references/form-and-url-state.md](references/form-and-url-state.md#3-url-driven-state-modernization-usesearchparams) for full before/after code.

### E. Extract Remaining Logic into Custom Hooks
Extract React Query calls (`useQuery`, `useMutation`), side effects (`useEffect`), keyboard shortcuts, and WebMCP registrations into custom hooks under `hooks/`. Ensure `<ComponentName>.tsx` focuses purely on composition, layout, and presentation.

### F. File Length Gate
Target: `<ComponentName>.tsx` under 200 lines. Hard limit: no component file may exceed 300 lines.

---

## 7. Step 6: Fix Imports Across Workspace

1. Inside `<ComponentName>/`: Update imports to relative paths (`./types`, `./hooks/...`, `./components/...`).
2. Outside `<ComponentName>/`: Confirm external imports `from '../components/<ComponentName>'` resolve cleanly via `index.ts`.
3. **Parallel Subagent Refactoring**: When refactoring multiple components concurrently across subagents, assign strictly disjoint component folders and run central verification (`tsc`, `vitest`, `build`) in Wave 2.

---

## 8. Step 7: Pre-Commit Quality Gates Validation

Before completing the refactoring or committing, follow the [`commit`](/.agents/skills/commit/SKILL.md) skill to execute and pass all validation gates in order (`tsc --noEmit`, unit tests, Storybook tests, full build, and UI QA verification if visual UI changed).

### Refactoring Verification Checklist
- [ ] Scaffolded module structure with script (`index.ts`, `types.ts`, `components/`, `hooks/`).
- [ ] Forms reworked from `useState` to `react-hook-form` (`useForm`, `Controller`, `FormProvider`).
- [ ] Filter, sort, search, and pagination state migrated from `useState` to React Router `useSearchParams`.
- [ ] Single component per file: subcomponents extracted to `components/`.
- [ ] Data fetching and side effects extracted to `hooks/`.
- [ ] Public API re-exported cleanly in `index.ts`.
- [ ] All component files strictly under 300 lines (<200 target).
- [ ] Tests and stories colocated and passing.

---

## Reference Examples
- **Modular Folder Architecture**: [packages/admin-ui/src/components/ThemeEditor/](/packages/admin-ui/src/components/ThemeEditor)
- **react-hook-form & URL State**: [packages/admin-ui/src/pages/Editor/](/packages/admin-ui/src/pages/Editor)
- **Code Templates & Before/After Examples**: [references/form-and-url-state.md](references/form-and-url-state.md)
- **Architectural Rules**: [react-code skill](/.agents/skills/react-code/SKILL.md)
