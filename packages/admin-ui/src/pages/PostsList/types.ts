export type PostStatus = 'published' | 'draft' | 'scheduled';

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
}
