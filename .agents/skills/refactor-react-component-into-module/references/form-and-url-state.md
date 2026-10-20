# Form and URL State Modernization Reference

Reference implementations and code patterns for migrating monolithic state in `packages/admin-ui` components.

---

## 1. Types Template (`types.ts`)

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

---

## 2. Form State Modernization (`react-hook-form`)

### Before & After Example

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

## 3. URL-Driven State Modernization (`useSearchParams`)

### Before & After Example

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
