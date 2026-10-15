export interface PageItem {
  id: number;
  title: string;
  slug: string;
  status: 'published' | 'draft';
  updatedAt: string;
}

export interface UsePagesFiltersReturn {
  search: string;
  setSearch: (value: string) => void;
}
