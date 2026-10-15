import React from 'react';
import { Box, Card } from '@radix-ui/themes';
import { useDocsData, useDocsFilters } from './hooks';
import { DocsHeader, DocsSearchBar, DocsTable } from './components';

export const DocsList: React.FC = () => {
  const { docs, isLoading } = useDocsData();
  const { search, setSearch } = useDocsFilters();

  return (
    <Box>
      <DocsHeader />

      <Card size="2">
        <DocsSearchBar value={search} onChange={setSearch} />
        <DocsTable docs={docs} search={search} isLoading={isLoading} />
      </Card>
    </Box>
  );
};

export default DocsList;
