import React, { useMemo } from 'react';
import { Box, Card } from '@radix-ui/themes';
import { PagesHeader, PagesSearchBar, PagesTable } from './components';
import { usePagesData, usePagesFilters } from './hooks';

export const PagesList: React.FC = () => {
  const { pages, isLoading } = usePagesData();
  const { search, setSearch } = usePagesFilters();

  const filteredPages = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
    );
  }, [pages, search]);

  return (
    <Box>
      <PagesHeader />

      <Card size="2">
        <PagesSearchBar value={search} onChange={setSearch} />
        <PagesTable pages={filteredPages} isLoading={isLoading} />
      </Card>
    </Box>
  );
};

export default PagesList;
