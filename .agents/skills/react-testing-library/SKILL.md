---
name: react-testing-library
description: >-
  Guidelines, best practices, query priorities, and anti-patterns for React Testing Library (RTL).
  Use whenever writing, debugging, refactoring, or reviewing unit and integration tests for React
  components and custom hooks in packages/admin-ui.
---

# React Testing Library Guidelines & Best Practices

This skill outlines the philosophy, query priorities, common mistakes to avoid, and industry best practices when testing React components and custom hooks with React Testing Library (`@testing-library/react`), `@testing-library/user-event`, and Vitest.

---

## 1. Guiding Principles

Testing Library is built on a foundational philosophy:

> **"The more your tests resemble the way your software is used, the more confidence they can give you."**

### Core Tenets
1. **Test User-Visible Behavior, Not Implementation Details**:
   - Avoid testing component state, private variables, internal methods, or lifecycle hooks.
   - Refactoring internal code (e.g., swapping `useState` for `useReducer`, or changing an internal component structure) should **never** break your tests if the user-facing behavior remains the same.
2. **Work with Real DOM Nodes**:
   - Assert against actual DOM elements rendered in the container rather than component instances or virtual DOM wrappers.
3. **Reflect Real User and Assistive Technology Interactions**:
   - Users find buttons by their label/text or visual role, form fields by their associated labels, and status messages by their text. Tests should locate and interact with elements using the same semantic cues.
4. **Keep Tests Resilient and Maintainable**:
   - Write tests that give high confidence without being brittle. Don't test third-party libraries (e.g., whether React or TanStack Query works); test how your component responds to inputs and events.

---

## 2. Query Hierarchy & Selection Strategy

Always choose queries based on how accessible the element is to users and assistive technologies. Follow this strict priority order:

```text
Priority 1: Queries Accessible to Everyone
  ├── getByRole (Primary query for almost all interactive elements)
  ├── getByLabelText (Primary query for form inputs)
  ├── getByPlaceholderText (Fallback for inputs lacking accessible labels)
  ├── getByText (Static text: headings, paragraphs, non-interactive elements)
  └── getByDisplayValue (Form elements with existing/current values)

Priority 2: Semantic Queries
  ├── getByAltText (Images, icons with alt text, area elements)
  └── getByTitle (Elements or SVGs with title attributes / tooltips)

Priority 3: Test IDs (Last Resort)
  └── getByTestId (Escape hatch when text/role is dynamic or untestable via a11y tree)
```

### Query Variants Matrix: `getBy*` vs `queryBy*` vs `findBy*`

| Variant | Element Exists (Single) | Element Missing | Multiple Elements | Async / Waits? | Primary Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`getBy*`** | Returns node | **Throws error** (dumps DOM) | **Throws error** | No (sync) | Asserting an element is synchronously present |
| **`getAllBy*`** | Returns array of 1+ | **Throws error** | Returns array | No (sync) | Finding multiple matching elements |
| **`queryBy*`** | Returns node | **Returns `null`** | **Throws error** | No (sync) | **ONLY** asserting element non-existence |
| **`queryAllBy*`**| Returns array | Returns `[]` | Returns array | No (sync) | Asserting zero elements exist |
| **`findBy*`** | Returns Promise\<node\> | **Rejects Promise** (timeout) | **Rejects Promise** | **Yes (async)** | Asserting element appears after event/fetch |
| **`findAllBy*`** | Returns Promise\<array\>| **Rejects Promise** (timeout) | Returns Promise\<array\>| **Yes (async)** | Waiting for multiple elements to appear |

---

## 3. Patterns to Follow

Based on Kent C. Dodds' *Common Mistakes with React Testing Library*, follow these patterns (each lists the anti-pattern it replaces):

### 1. Use `screen`
- **Mistake**: Destructuring queries from the return object of `render()`.
  ```tsx
  // ❌ BAD: Destructuring render output
  const { getByRole, queryByText } = render(<UserCard name="Ada" />);
  expect(getByRole('heading')).toBeDefined();
  ```
- **Fix**: Use `screen` from `@testing-library/react`. It automatically queries `document.body`, simplifies imports, and outputs the entire DOM when an assertion fails.
  ```tsx
  //  GOOD: Using screen
  render(<UserCard name="Ada" />);
  expect(screen.getByRole('heading', { name: 'Ada' })).toBeDefined();
  ```

### 2. Use `getBy*` for existence checks (and `queryBy*` only for absence)
- **Mistake**: Using `queryBy*` when asserting that an element exists.
  ```tsx
  // ❌ BAD: Returns null on failure, yielding unhelpful error messages
  expect(screen.queryByRole('button', { name: /save/i })).toBeDefined(); // null is still defined!
  ```
- **Fix**: Use `getBy*` (or `findBy*`). It throws immediately with a helpful DOM snapshot if the element is missing.
  ```tsx
  //  GOOD: getBy* throws descriptive failure with DOM hierarchy
  expect(screen.getByRole('button', { name: /save/i })).toBeDefined();

  //  GOOD: Only use queryBy* when asserting absence
  expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  ```

### 3. Use `@testing-library/user-event` instead of `fireEvent`
- **Mistake**: Using `fireEvent.click()` or `fireEvent.change()`. `fireEvent` dispatches raw, synthetic DOM events without simulating focus, hover, keyup/keydown sequences, or device interactions.
- **Fix**: Use `@testing-library/user-event` (v14+ setup instance).
  ```tsx
  // ❌ BAD: Synthetic event bypasses browser lifecycle
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'ada@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));

  //  GOOD: userEvent reproduces exact user keystrokes, pointer, and focus states
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));
  ```

### 4. Use `findBy*` to wait for elements
- **Mistake**: Manually wrapping `getBy*` inside `waitFor`.
  ```tsx
  // ❌ BAD: Unnecessary wrapper boilerplate
  const alert = await waitFor(() => screen.getByRole('alert'));
  ```
- **Fix**: Use `findBy*`, which combines `getBy*` and `waitFor` under the hood.
  ```tsx
  //  GOOD: Clean and expressive
  const alert = await screen.findByRole('alert');
  ```

### 5. Perform side-effects outside `waitFor`
- **Mistake**: Triggering interactions or mutations inside `waitFor`. Because `waitFor` polls repeatedly until its callback passes or times out, side-effects execute multiple times!
  ```tsx
  // ❌ BAD: Click fires multiple times on retry!
  await waitFor(async () => {
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByText(/success/i)).toBeDefined();
  });
  ```
- **Fix**: Perform all interactions **outside** `waitFor`, reserving `waitFor` strictly for non-deterministic assertions.
  ```tsx
  //  GOOD: Interaction once, poll only the expectation
  await user.click(screen.getByRole('button', { name: /submit/i }));
  await waitFor(() => {
    expect(screen.getByText(/success/i)).toBeDefined();
  });
  ```

### 6. Use a single assertion per `waitFor` callback
- **Mistake**: Putting multiple expectations into one `waitFor`. If an earlier assertion passes but a later one fails, `waitFor` retries the whole block until timeout, delaying test execution and masking root causes.
  ```tsx
  // ❌ BAD: Multiple assertions in waitFor
  await waitFor(() => {
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/success/i)).toBeDefined();
  });
  ```
- **Fix**: Wait for the primary async outcome or DOM change, then make synchronous assertions afterward.
  ```tsx
  //  GOOD: Wait for primary signal, assert rest synchronously
  await waitFor(() => expect(screen.getByText(/success/i)).toBeDefined());
  expect(mockSave).toHaveBeenCalledTimes(1);
  ```

### 7. Wait for a specific outcome in `waitFor`
- **Mistake**: Using `await waitFor(() => {})` or `await waitFor(() => undefined)` to "flush microtasks".
- **Fix**: Wait for a specific assertion, element appearance (`findByRole`), or element removal (`waitForElementToBeRemoved`).

### 8. Let RTL handle `act(...)` automatically
- **Mistake**: Scattering `act(() => { ... })` around `render()`, `userEvent`, or `waitFor`.
- **Fix**: RTL wraps `render`, `userEvent`, and async queries in `act` automatically. If an `act(...)` warning appears in tests, it indicates unhandled async promises or unawaited timers in the component code—resolve the pending promise via `findBy*` or `waitFor` instead of band-aiding with manual `act`.

### 9. Query by role, label, or text instead of CSS selectors
- **Mistake**: Querying elements via CSS classes or DOM structure (`container.querySelector('.btn-primary')`).
- **Fix**: Query via role, label, or text. CSS classes and element hierarchies are implementation details that break on style refactors.

### 10. Rely on automatic `cleanup()`
- **Mistake**: Adding `afterEach(() => cleanup())` in test files.
- **Fix**: Vitest and modern test runners automatically invoke `cleanup()` after each test. Manual calls are redundant.

### 11. Destructure only helpers from `render()` (no `wrapper` variable)
- **Mistake**: `const wrapper = render(<Component />);` (legacy Enzyme habit).
- **Fix**: Use `screen` for queries. If helper methods are needed, destructure them: `const { rerender, unmount } = render(<Component />);`.

### 12. Use `waitForElementToBeRemoved` for disappearing elements
- **Mistake**: Waiting for an element to vanish using `waitFor` with `queryBy*`.
  ```tsx
  // ❌ SUBOPTIMAL: Polling queryBy inside waitFor
  await waitFor(() => expect(screen.queryByText(/loading/i)).toBeNull());
  ```
- **Fix**: Use `waitForElementToBeRemoved`. It accepts an element or callback, listens to MutationObserver directly, and fails immediately if the element never existed.
  ```tsx
  //  GOOD: MutationObserver-driven removal
  await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));
  ```

### 13. Avoid Tautological Assertions (`expect(getBy*).toBeDefined()`)
- **Mistake**: Wrapping `getBy*` in `expect(...).toBeDefined()`.
  ```tsx
  // ❌ BAD: Tautological assertion
  expect(screen.getByRole('button', { name: /save/i })).toBeDefined();

  // ❌ DANGEROUS: null is defined, so this passes even when element is missing!
  expect(screen.queryByRole('alert')).toBeDefined();
  ```
- **Fix**: `getBy*` throws an error automatically when the element is missing. Calling `.toBeDefined()` on its return value tests nothing. Either let `screen.getByRole(...)` stand as the presence assertion, or assert a meaningful semantic state:
  ```tsx
  //  GOOD: Assert presence via getByRole directly (it throws descriptive error if missing)
  const saveBtn = screen.getByRole('button', { name: /save/i });

  //  GOOD: Assert meaningful state, accessibility, or content
  expect(saveBtn.hasAttribute('disabled')).toBe(false);
  expect(screen.getByRole('switch', { name: /published/i }).getAttribute('aria-checked')).toBe('true');
  expect(screen.getByRole('textbox', { name: /title/i }).getAttribute('value')).toBe('My Post');
  expect(screen.queryByRole('alert')).toBeNull(); // Correct absence check
  ```

### 14. Radix UI / Animated Dialog & Popover Teardown
- **Mistake**: Closing a Radix dialog, sheet, popover, or dropdown and immediately ending the test.
  Radix UI components (`Dialog`, `Popover`, `Tooltip`, `Select`, `DropdownMenu`) use `@radix-ui/react-presence` to coordinate exit animations and cleanup microtasks. If a test ends while an exit animation is pending, React unmounts in the background, firing hundreds of:
  `stderr | An update to Presence inside a test was not wrapped in act(...)`
- **Fix**: Always await complete removal from the DOM using `waitForElementToBeRemoved`:
  ```tsx
  //  GOOD: Wait for Radix dialog / presence teardown before ending test
  await user.click(screen.getByRole('button', { name: /cancel|close/i }));
  await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  ```

### 15. React Query Mutation Invalidation & In-Flight Refetches
- **Mistake**: Firing a mutation (e.g. delete, save, publish) that calls `queryClient.invalidateQueries(...)`, asserting that the mutation API was called, and ending the test immediately.
  When a query is invalidated, React Query schedules an immediate background refetch. If the refetch has no mock handler or completes after the test unmounts, it produces unhandled `act(...)` warnings:
  `stderr | An update to Component inside a test was not wrapped in act(...)`
- **Fix**: Either provide a mock for the subsequent query refetch and await the updated UI, or await query client settlement before ending the test:
  ```tsx
  //  GOOD: Provide refetch mock and assert resulting DOM change
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }); // mutation
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // subsequent refetch
  await user.click(screen.getByRole('button', { name: /delete/i }));
  await waitForElementToBeRemoved(() => screen.queryByText('Item 1'));
  ```

### 16. Controlled Form Fields with React Hook Form `Controller`
- **Mistake**: Using `fireEvent.change` or `fireEvent.click` on controlled inputs (Radix `Select`, `Switch`, or inputs bound via React Hook Form `Controller`). `fireEvent` dispatches raw synthetic DOM events that bypass React Hook Form's event queue and microtask flushing, producing:
  `stderr | An update to Controller inside a test was not wrapped in act(...)`
- **Fix**: Always use `const user = userEvent.setup()`, await keystrokes and clicks, and assert the resulting form or button state:
  ```tsx
  const user = userEvent.setup();
  const titleInput = screen.getByRole('textbox', { name: /title/i });
  await user.clear(titleInput);
  await user.type(titleInput, 'New Title');
  expect(titleInput.getAttribute('value')).toBe('New Title');
  ```

### 17. Console Output Hygiene in Negative / Error Tests
- **Mistake**: Triggering intentional 400/409 errors or malformed JSON parsing without intercepting `console.error` or `console.warn`, dumping distracting stack traces into the test runner logs.
- **Fix**: Spy on `console.error` (or `console.warn`) for the duration of the negative test:
  ```tsx
  it('handles malformed server response gracefully', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    apiFetch.mockRejectedValueOnce(new Error('Malformed response'));

    renderWithProviders(<SettingsPage />);
    expect(await screen.findByText(/failed to load settings/i)).toBeDefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
  ```

---

## 4. Industry Best Practices

### A. Always Initialize `userEvent.setup()`
In `@testing-library/user-event` v14+, always call `userEvent.setup()` before rendering or interacting:
```tsx
it('submits form on button click', async () => {
  const user = userEvent.setup();
  render(<LoginForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/username/i), 'ryan');
  await user.click(screen.getByRole('button', { name: /log in/i }));

  expect(handleSubmit).toHaveBeenCalledWith({ username: 'ryan' });
});
```

### B. Leverage Accessible Names (`name` option in `getByRole`)
Differentiate buttons, headings, and links by their accessible name:
```tsx
// Precise role-based querying:
screen.getByRole('button', { name: /save changes/i });
screen.getByRole('heading', { level: 2, name: /project settings/i });
screen.getByRole('link', { name: /privacy policy/i });
screen.getByRole('dialog', { name: /confirm deletion/i });
```

### C. Use Custom Render Wrappers for Context & Providers
Never render raw UI components that depend on routing, themes, or queries without their requisite providers.
In `packages/admin-ui`, always use the centralized `renderWithProviders` (or re-exported `render`) from `src/test/test-utils.tsx`:
```tsx
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { EntryEditor } from './EntryEditor';

describe('EntryEditor', () => {
  it('renders entry data with router and query client', async () => {
    const user = userEvent.setup();
    render(<EntryEditor id="entry-123" />, {
      route: '/entries/entry-123',
    });

    expect(await screen.findByRole('textbox', { name: /title/i })).toBeDefined();
  });
});
```

### D. Mock at API / Network Boundaries, Never Internal Hooks
- **Good**: Mock the `apiFetch` utility or intercept requests via MSW (Mock Service Worker).
- **Bad**: Mocking `useQuery`, `useMutation`, or component-internal hooks. Mocking hooks turns an integration test into a brittle echo of component internals.

### E. Portable Assertions in Vitest / Zygo CMS
Per `packages/admin-ui/AGENTS.md`, root `pnpm run test:all` executes via the root Vitest config without loading `@testing-library/jest-dom` matchers globally.
Use portable Vitest/Chai assertions in `*.test.tsx`:
```tsx
//  PORTABLE ASSERTIONS (Recommended for Zygo CMS test suites):
expect(screen.getByRole('button')).toBeDefined();
expect(screen.queryByRole('alert')).toBeNull();
expect(button.hasAttribute('disabled')).toBe(true);
expect(input.getAttribute('value')).toBe('draft');
expect(element.textContent).toContain('Success');

// ⚠️ Avoid depending exclusively on jest-dom matchers in unit tests:
// expect(screen.getByRole('button')).toBeInTheDocument(); // Can fail if jest-dom isn't loaded
```

### F. Getter-Only Browser Properties in HappyDOM
When mocking APIs like `navigator.clipboard` in HappyDOM, `Object.assign` throws a `TypeError`. Always use `Object.defineProperty`:
```tsx
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  configurable: true,
});
```

---

## 5. Query Decision Flowchart

When choosing which query to use, follow this decision path:

```
Is the element interactive or does it have an ARIA role?
├── YES ──> Use screen.getByRole(role, { name: /.../i })
└── NO
    ├── Is it a form field?
    │   ├── YES (has label) ──> Use screen.getByLabelText(/.../i)
    │   └── NO label ──────────> Use screen.getByPlaceholderText(/.../i)
    ├── Is it text content (heading, paragraph, badge)?
    │   └── YES ───────────────> Use screen.getByText(/.../i)
    ├── Is it an image or graphic?
    │   └── YES ───────────────> Use screen.getByAltText(/.../i)
    └── Is it untestable via role/text/label?
        └── YES (escape hatch) > Use screen.getByTestId('...')
```

### Async / Presence Decision Flowchart

```
What is the expected state of the element?
├── Element is rendered immediately (synchronous)
│   └── Use screen.getByRole(...)
├── Element appears asynchronously (after fetch / timer / event)
│   └── Use await screen.findByRole(...)
├── Element is expected NOT to be in the document
│   └── Use expect(screen.queryByRole(...)).toBeNull()
└── Element is visible and expected to disappear
    └── Use await waitForElementToBeRemoved(() => screen.queryByRole(...))
```

---

## 6. Pre-Commit Checklist for React Tests

Before committing or finishing a test task:
- [ ] Queries use `screen` rather than destructuring from `render()`.
- [ ] Accessible queries (`getByRole`, `getByLabelText`, `getByText`) are prioritized over `getByTestId`.
- [ ] No CSS class names or `container.querySelector` calls used for queries.
- [ ] User interactions use `userEvent.setup()` and are properly `await`ed (no `fireEvent`).
- [ ] `queryBy*` is used **only** for asserting non-existence (`expect(...).toBeNull()`).
- [ ] No tautological assertions (`expect(getBy*).toBeDefined()`); assert semantic attributes, text, or states.
- [ ] Async element arrivals use `await screen.findBy*` instead of `waitFor(() => screen.getBy*)`.
- [ ] Disappearing elements/modals use `await waitForElementToBeRemoved(...)` (especially for Radix UI `Presence`).
- [ ] No side-effects or interactions exist inside `waitFor` callbacks.
- [ ] `waitFor` callbacks contain a single expectation.
- [ ] No unnecessary `act(...)` wrappers.
- [ ] In-flight React Query invalidations are either mocked or awaited before ending tests.
- [ ] Negative/error test cases silence expected console output via `vi.spyOn(console, 'error')`.
- [ ] Assertions use portable Vitest/Chai matchers for compatibility with `pnpm run test:all`.
- [ ] Targeted test passes: `pnpm exec vitest run <path/to/test.tsx>`.
- [ ] Test runs cleanly with **zero `act(...)` warnings** in stderr logs.
- [ ] Full workspace test passes: `pnpm run test:all`.
