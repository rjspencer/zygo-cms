import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { UsePostsFiltersReturn } from '../types';

export function usePostsFilters(): UsePostsFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = useMemo(() => searchParams.get('q') ?? '', [searchParams]);
  const status = useMemo(() => searchParams.get('status') ?? 'all', [searchParams]);

  const setSearch = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set('q', value);
        } else {
          next.delete('q');
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const setStatus = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value && value !== 'all') {
          next.set('status', value);
        } else {
          next.delete('status');
        }
        return next;
      });
    },
    [setSearchParams]
  );

  return {
    search,
    setSearch,
    status,
    setStatus,
  };
}
