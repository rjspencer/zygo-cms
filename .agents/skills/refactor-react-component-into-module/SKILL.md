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

This skill guides the end-to-end refactoring of monolithic or flat React components in `packages/admin-ui` into clean, colocated, modular folder structures patterned after [ThemeEditor](/packages/admin-ui/src/components/ThemeEditor).

> **Best Practices Reference**: Always consult and follow the [react-code skill](/.agents/skills/react-code/SKILL.md) for architectural guidelines, file length limits (<200 warning, <300 hard limit), single-component-per-file rules, custom hook isolation, and Storybook 1+2+4 verification protocols.

### Key State Modernization Rules
- **Forms**: `react-hook-form` is already installed in `packages/admin-ui`. When refactoring a component with a form that uses `useState`, **rework it to use `react-hook-form` instead**.
- **URL-Driven State**: If the state tracks values that belong in the URL—such as **filter, sort, search, or pagination**—**use React Router hooks (`useSearchParams`) instead of `useState`**.

---

## 1. The Target Module Architecture

Every modularized component follows the colocation pattern established by [ThemeEditor](/packages/admin-ui/src/components/ThemeEditor):

```text
packages/admin-ui/src/components/<ComponentName>/
├── <ComponentName>.tsx          # Main component orchestrating view & composition
├── <ComponentName>.test.tsx     # Colocated Vitest & React Testing Library tests
├── <ComponentName>.stories.tsx  # Colocated Storybook stories (mandatory per 1+2+4 protocol)
├── types.ts                     # Props, form schemas, filter models, component interfaces
├── index.ts                     # Public API barrel export (preserves consumer imports)
├── components/                  # Local subcomponents extracted from parent
│   └── <SubComponent>/
│       └── <SubComponent>.tsx
└── hooks/                       # Extracted custom hooks (react-hook-form, React Router, queries, WebMCP)
    ├── use<ComponentName>Form.ts     # react-hook-form setup & submission
    ├── use<ComponentName>Filters.ts  # React Router useSearchParams for filter/sort
    └── use<ComponentName>Data.ts     # TanStack React Query hooks
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

### 4. Audit Existing State for Modernization
Scan `<ComponentName>.tsx` for legacy state patterns before decomposing:
- **Form inputs in `useState`**: Look for individual field states (`[title, setTitle]`, `[email, setEmail]`) or form object states (`[formData, setFormData]`). Plan to rework these to `react-hook-form` in Step 5.
- **Filter/Sort in `useState`**: Look for filter, sort, search query, or pagination states (`[filter, setFilter]`, `[sort, setSort]`). Plan to migrate these to React Router URL search parameters in Step 5.

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

// Form values managed via react-hook-form
export interface <ComponentName>FormValues {
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published';
}

// Filter and sort parameters managed via React Router useSearchParams
export interface <ComponentName>FilterParams {
  filter: string;
  sort: string;
  order: 'asc' | 'desc';
  page: number;
}
```

In `<ComponentName>.tsx`, import the types:
```typescript
import type { <ComponentName>Props, <ComponentName>FormValues } from './types';
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

### C. Rework Form State to `react-hook-form`
> **Important**: `react-hook-form` is already installed in `packages/admin-ui` (see `package.json`). Do not install alternative form libraries or keep scattered `useState` form variables.

When refactoring a component with a form that uses `useState` (e.g., individual states like `const [title, setTitle] = useState('')` and `const [slug, setSlug] = useState('')`, or a monolithic `const [formData, setFormData] = useState(...)`), **do not merely move `useState` into a custom hook. Rework the form to use `react-hook-form` instead.**

#### Rules for Form Refactoring:
1. **Define Form Types**: Declare the form schema in `types.ts` (`export interface <ComponentName>FormValues { ... }`).
2. **Initialize `useForm`**: Use `useForm<FormValues>({ defaultValues: ... })`.
3. **Register or Control Inputs**:
   - For standard HTML inputs, use `register('fieldName')`.
   - For Radix UI controlled components (`Select`, `Switch`, `Slider`, etc.), use `Controller` or `useController` from `react-hook-form`.
4. **Subcomponent Access without Prop-Drilling**:
   - Wrap the form in `<FormProvider {...methods}>`.
   - In extracted child field components (e.g., `components/TitleField.tsx`), consume the form via `useFormContext<FormValues>()` and `useWatch`.
   - Follow the established pattern from [packages/admin-ui/src/pages/Editor](/packages/admin-ui/src/pages/Editor).
5. **Extract Submit & Form Logic**: Place form setup, validation, and mutation triggers into a dedicated custom hook under `hooks/use<ComponentName>Form.ts`.

#### Before & After Example:

```tsx
// ❌ BEFORE: Monolithic useState form inputs with manual change handlers
export const LegacyForm = ({ initialData, onSave }) => {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [category, setCategory] = useState(initialData?.category ?? 'general');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, category });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <select value={category} onChange={(e) => setCategory(e.target.value)}>...</select>
      <button type="submit">Save</button>
    </form>
  );
};

// ✅ AFTER: Modernized with react-hook-form + types + FormProvider
// hooks/useLegacyForm.ts
export const useLegacyForm = (initialData: LegacyFormValues, onSave: (data: LegacyFormValues) => void) => {
  const methods = useForm<LegacyFormValues>({ defaultValues: initialData });
  const onSubmit = methods.handleSubmit((data) => onSave(data));
  return { methods, onSubmit };
};

// LegacyForm.tsx
export const LegacyForm: React.FC<LegacyFormProps> = ({ initialData, onSave }) => {
  const { methods, onSubmit } = useLegacyForm(initialData, onSave);

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit}>
        <TitleField />
        <CategoryField />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
};
```

---

### D. Synchronize URL-Driven State with React Router
If the state tracks values that belong in the URL—such as **filter, sort, search query, page number, or active view/tab**—**use React Router hooks (`useSearchParams` from `react-router-dom`) instead of `useState`**.

#### Why URL State?
- **Shareable & Bookmarkable**: Users can link directly to a specific filtered and sorted view.
- **Browser History**: Navigating back/forward preserves user filter and sort selections.
- **Reload Resilience**: Filter and sort choices are not wiped out when refreshing the page.

#### Rules for URL-Driven State:
1. **Never use `useState` for filter/sort**: Replace `const [filter, setFilter] = useState(...)` with `useSearchParams()`.
2. **Extract to a Custom Hook**: Place search param parsing, serialization, and updater functions in `hooks/use<ComponentName>Filters.ts` or `hooks/use<ComponentName>Params.ts`.
3. **Immutable Updates**: When updating one param (e.g., changing sort), preserve other existing search params by modifying a new `URLSearchParams(prev)` instance.
4. **Reset Page on Filter Change**: Whenever a search or filter changes, always reset pagination (`page = 1`).

#### Before & After Example:

```tsx
// ❌ BEFORE: Local useState losing filter and sort on page refresh
export const ItemList = () => {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('date');
  const [search, setSearch] = useState('');
  // State is lost on reload, cannot be bookmarked or shared via link!
  return <div>...</div>;
};

// ✅ AFTER: React Router useSearchParams hook
// hooks/useItemListFilters.ts
import { useSearchParams } from 'react-router-dom';

export const useItemListFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filter = searchParams.get('filter') ?? 'all';
  const sort = searchParams.get('sort') ?? 'date';
  const order = (searchParams.get('order') as 'asc' | 'desc') ?? 'desc';
  const search = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page') ?? '1');

  const updateParam = (key: string, value: string | null, resetPage = true) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      if (resetPage) {
        next.set('page', '1');
      }
      return next;
    });
  };

  return {
    filter,
    sort,
    order,
    search,
    page,
    setFilter: (val: string) => updateParam('filter', val === 'all' ? null : val),
    setSort: (val: string) => updateParam('sort', val),
    setSearch: (val: string) => updateParam('q', val.trim() || null),
    setPage: (p: number) => updateParam('page', String(p), false),
  };
};
```

---

### E. Extract Remaining Logic into Custom Hooks
- Identify React Query calls (`useQuery`, `useMutation`), side effects (`useEffect`), keyboard shortcuts, and WebMCP registrations.
- Extract them into custom hooks under `<ComponentName>/hooks/` (e.g., `use<ComponentName>Data.ts`, `use<ComponentName>WebMCP.ts`).
- Ensure the main `<ComponentName>.tsx` focuses purely on composition, layout, and presentation.

### F. File Length Gate
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

- **Modular Folder Architecture**: Inspect [packages/admin-ui/src/components/ThemeEditor/](/packages/admin-ui/src/components/ThemeEditor) for an existing, fully decomposed module implementation.
- **react-hook-form & URL State**: Inspect [packages/admin-ui/src/pages/Editor/](/packages/admin-ui/src/pages/Editor) for production examples of `react-hook-form` (`EditorForm`, `FormProvider`, `useFormContext`) and React Router `useSearchParams` (`useEntryType`).
- **Architectural Rules**: Consult [react-code skill](/.agents/skills/react-code/SKILL.md) for standards on hooks, testing, accessibility, and WebMCP tool registration.
