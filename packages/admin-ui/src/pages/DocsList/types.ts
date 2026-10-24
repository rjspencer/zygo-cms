export type DocStatus = 'draft' | 'in_review' | 'ready_for_publish' | 'published' | 'archived' | 'scheduled';

export interface DocItem {
  id: number;
  title: string;
  slug: string;
  path: string;
  status: DocStatus;
  updatedAt: string;
  parent_id: number | null;
  sort_order: number | null;
}

export interface UseDocsFiltersReturn {
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
}

export interface UseDocsDataOptions {
  onDeleteSuccess?: () => void;
  onDeleteSettled?: () => void;
}

export interface UseDocsDataReturn {
  docs: DocItem[];
  isLoading: boolean;
  deleteDoc: (id: number) => void;
  isDeleting: boolean;
}
