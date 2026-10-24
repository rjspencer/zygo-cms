export type PostStatus = 'draft' | 'in_review' | 'ready_for_publish' | 'published' | 'archived' | 'scheduled';

export interface PostItem {
  id: number;
  title: string;
  slug: string;
  status: PostStatus;
  date: string;
}

export interface UsePostsFiltersReturn {
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
}
