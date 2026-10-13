---
name: react-code
description: >-
  Guidelines, component architecture, and refactoring standards for working on React code.
  Use whenever writing, modifying, decomposing, or reviewing React components, custom hooks,
  or frontend architecture in packages/admin-ui.
---

# React Component Development & Architecture Guidelines

This skill defines the architectural, structural, and coding standards for all React code in Zygo CMS (primarily in `packages/admin-ui`). Every React component, hook, and test must adhere to these rules.

---

## 1. Implementation Planning: Component Hierarchy Tree

Before writing or refactoring any React code, **you MUST document the component hierarchy tree** in your implementation plan.

### Rules
- Explicitly map parent-to-child relationships before creating or modifying files.
- Use explicit arrow syntax (`Parent -> ChildA, ChildB`) or an indented tree representation.
- Identify child component boundaries, extracted hooks, and file locations during planning.

### Example Plan Format

```text
Component Tree:
Editor -> EditorHeader, EditorCanvas, EditorSidebar, UnsavedChangesDialog
├── EditorHeader -> Breadcrumbs, SaveStatusBadge, ActionButtons
├── EditorCanvas -> TitleInput, TipTapEditor
└── EditorSidebar -> MetadataPanel, SectionList, SettingsDrawer
    ├── MetadataPanel -> SlugField, CategoryPicker, TagList
    └── SectionList -> SectionCard, AddSectionButton
```

---

## 2. Component File Length Limits

To keep components readable, maintainable, and easy to test:

- **Hard Limit: 300 Lines Maximum**: A component file must never exceed 300 lines of code. If a file reaches 300 lines, it must be decomposed before merging or committing.
- **Soft Limit: 200 Lines (Decomposition Warning)**: When a component file exceeds 200 lines, actively plan and execute decomposition:
  - Extract subcomponents into a local `./components/` directory.
  - Extract complex logic, state transitions, or side effects into custom hooks in `./hooks/`.
  - Extract static lookup tables, constants, or types into dedicated files.

---

## 3. Single Component Per File

**Strictly forbidden**: Declaring multiple functional components within the same file.

- Every functional component must live in its own dedicated file.
- Do not create inline "helper" components (e.g., `const ListItem = () => ...`, `const EmptyState = () => ...`, or internal dialog components) at the bottom or top of a parent component file.
- If a piece of UI is reusable or warrants its own component function, extract it into its own file immediately.
- Exception: Pure render functions that return JSX primitives without component state/lifecycle are tolerated only if trivial (<10 lines); otherwise, extract them as true subcomponents.

---

## 4. Immediate Child UI Component Extraction

Child UI components specific to a parent must be extracted into a local `./components/` subfolder immediately—never left inline or in the parent directory.

### Structure Example
```text
Editor/
├── Editor.tsx
├── Editor.module.css
├── Editor.test.tsx
├── Editor.stories.tsx
├── components/
│   ├── EditorHeader/
│   │   ├── EditorHeader.tsx
│   │   ├── EditorHeader.test.tsx
│   │   └── components/
│   ├── EditorSidebar/
│   │   ├── EditorSidebar.tsx
│   │   └── hooks/
│   └── EditorCanvas/
│       └── EditorCanvas.tsx
└── hooks/
    ├── useEditorData.ts
    └── useEditorShortcuts.ts
```

### Guidelines
- If `Parent` needs a sub-view, toolbar, card item, or modal, create `Parent/components/Child/Child.tsx`.
- Keep child components local to the feature folder until 2+ distinct features need to share them, at which point promote them to `src/components/`.

---

## 5. Folder-per-Component & Colocation Pattern

Every component must be placed in a dedicated folder of the same name. Colocate all assets, logic, styles, and tests alongside the component file.

### Folder Colocation Layout
For any component `Foo`:
```text
Foo/
├── Foo.tsx                 # Main component implementation
├── Foo.module.css          # Scoped CSS or component styling (if applicable)
├── Foo.test.tsx            # Unit & integration tests
├── Foo.stories.tsx         # Storybook stories (mandatory for visual UI per 1+2+4 protocol)
├── components/             # Subcomponents used solely by Foo
│   └── FooItem/
│       └── FooItem.tsx
└── hooks/                  # Custom hooks used solely by Foo
    └── useFooState.ts
```

### Benefits
- Deleting or refactoring a feature is clean and isolated.
- Tests and stories live right next to the component they exercise.
- Navigation in IDE file trees is consistent and predictable.

---

## 6. Custom Hooks for Logic & Data Fetching

Component files should be lean and focused almost exclusively on layout, composition, and presentation.

### Rules
- **No Inline Data Fetching**: Never call `fetch`, `apiFetch`, or configure raw queries/mutations directly inside a UI component body.
- **Custom Hook Isolation**: Isolate all API fetching, TanStack React Query hooks (`useQuery`, `useMutation`), cache invalidation, and data transformations into custom hooks (e.g., `useEntryEditor.ts`).
- **Complex State & Effects**: Move complex `useEffect`, `useReducer`, event listeners, keyboard shortcuts, and form validations into custom hooks.
- **WebMCP Registration**: Isolate `useRegisterWebMCPTools` invocations and their tool definitions into a dedicated hook (e.g., `useEditorWebMCP.ts`) when tool definitions add significant line count.

### Example Hook Extraction

```tsx
// ❌ BAD: Bloated component with inline fetching & state logic
export const Editor = ({ id }: { id: string }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['entry', id], queryFn: () => apiFetch(`/api/entries/${id}`) });
  const mutation = useMutation({
    mutationFn: (body) => apiFetch(`/api/entries/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entries'] }),
  });
  // ... 200 more lines of logic and handlers ...
  return <div>...</div>;
};

//  GOOD: Lean component delegating to custom hook
export const Editor = ({ id }: { id: string }) => {
  const { entry, isLoading, isSaving, updateTitle, saveEntry } = useEditorData(id);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="editor-container">
      <EditorHeader title={entry.title} onSave={saveEntry} isSaving={isSaving} />
      <EditorCanvas entry={entry} onTitleChange={updateTitle} />
    </div>
  );
};
```

---

## 7. Quality Gates & Zygo CMS Integration

Whenever modifying React code in `packages/admin-ui`:

1. **Storybook (1+2+4 Protocol)**: Ensure all visual components have a `.stories.tsx` file and pass `pnpm --filter admin-ui test-storybook`.
2. **Typecheck**: Verify full TypeScript compliance:
   ```bash
   pnpm --filter admin-ui exec tsc --noEmit
   ```
3. **Unit Tests**: Run tests with Vitest:
   ```bash
   pnpm --filter admin-ui test
   ```
4. **Accessible Testing**: Use Testing Library queries like `getByRole` and `getByLabelText`. Avoid `getByTestId` unless no accessible role exists.
5. **WebMCP Parity**: If introducing new editable views or actions, expose corresponding WebMCP tools via `useRegisterWebMCPTools`.

---

## 8. Pre-Commit Verification Checklist

Before completing any task touching React code, verify:
- [ ] Component tree documented in the implementation plan.
- [ ] Every component resides in a folder of the same name (`Name/Name.tsx`).
- [ ] Exactly one functional component per file.
- [ ] Child components extracted to local `components/` subfolder.
- [ ] Data fetching and complex logic extracted to custom hooks (`hooks/`).
- [ ] Component file length is under 300 lines (and decomposed if > 200 lines).
- [ ] Tests (`*.test.tsx`) and Storybook stories (`*.stories.tsx`) colocated in the component folder.
- [ ] `pnpm --filter admin-ui exec tsc --noEmit` passes with 0 errors.
- [ ] `pnpm --filter admin-ui test` passes with all suites green.
