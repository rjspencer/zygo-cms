export interface DocItem {
  id: number;
  title: string;
  slug: string;
  path: string;
  status: 'published' | 'draft';
  updatedAt: string;
  parent_id: number | null;
  sort_order: number | null;
}

export interface UseDocsFiltersReturn {
  search: string;
  setSearch: (value: string) => void;
}

export interface UseDocsDataReturn {
  docs: DocItem[];
  isLoading: boolean;
}
