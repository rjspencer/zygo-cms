import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { UseTemplatesFiltersReturn } from '../types';

export function useTemplatesFilters(): UseTemplatesFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = useMemo(() => searchParams.get('q') ?? '', [searchParams]);

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

  return {
    search,
    setSearch,
  };
}
