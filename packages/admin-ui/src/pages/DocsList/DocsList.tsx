import React, { useState } from 'react';
import { Box, Card } from '@radix-ui/themes';
import { useDocsData, useDocsFilters } from './hooks';
import { DocsHeader, DocsSearchBar, DocsTable, DeleteDocDialog } from './components';
import type { DocItem } from './types';

export const DocsList: React.FC = () => {
  const [docToDelete, setDocToDelete] = useState<DocItem | null>(null);
  const { docs, isLoading, deleteDoc, isDeleting } = useDocsData({
    onDeleteSettled: () => setDocToDelete(null),
  });
  const { search, setSearch } = useDocsFilters();

  const handleConfirmDelete = () => {
    if (docToDelete) {
      deleteDoc(docToDelete.id);
    }
  };

  return (
    <Box>
      <DocsHeader />

      <Card size="2">
        <DocsSearchBar value={search} onChange={setSearch} />
        <DocsTable
          docs={docs}
          search={search}
          isLoading={isLoading}
          onDeleteClick={(doc) => setDocToDelete(doc)}
        />
      </Card>

      <DeleteDocDialog
        doc={docToDelete}
        isOpen={docToDelete !== null}
        onOpenChange={(open) => !open && setDocToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </Box>
  );
};

export default DocsList;
