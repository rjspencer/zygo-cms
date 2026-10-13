import { useLocation, useSearchParams } from 'react-router-dom';
import type { EntryType } from '../types';

/** Derived directly from the URL so route changes immediately update the entry type. */
export const useEntryType = (fetchedType?: string): EntryType => {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();

  if (pathname.startsWith('/pages') || pathname.startsWith('/page')) return 'page';
  if (pathname.startsWith('/posts') || pathname.startsWith('/post')) return 'post';
  if (pathname.startsWith('/docs') || pathname.startsWith('/doc')) return 'doc';
  const typeParam = searchParams.get('type');
  if (typeParam === 'page' || typeParam === 'post' || typeParam === 'doc') return typeParam;
  if (fetchedType === 'page' || fetchedType === 'post' || fetchedType === 'doc') return fetchedType;
  return 'post';
};
