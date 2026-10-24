export type PageStatus = 'draft' | 'in_review' | 'ready_for_publish' | 'published' | 'archived' | 'scheduled';

export interface PageItem {
  id: number;
  title: string;
  slug: string;
  status: PageStatus;
  updatedAt: string;
}

export interface UsePagesFiltersReturn {
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
}
