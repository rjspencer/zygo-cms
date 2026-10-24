import React, { useMemo, useState } from 'react';
import { Box, Card, Tabs } from '@radix-ui/themes';
import { useDocsData, useDocsFilters } from './hooks';
import { DocsHeader, DocsSearchBar, DocsTable, DeleteDocDialog } from './components';
import type { DocItem } from './types';

export const DocsList: React.FC = () => {
  const [docToDelete, setDocToDelete] = useState<DocItem | null>(null);
  const { docs, isLoading, deleteDoc, isDeleting } = useDocsData({
    onDeleteSettled: () => setDocToDelete(null),
  });
  const { search, setSearch, status, setStatus } = useDocsFilters();

  const handleConfirmDelete = () => {
    if (docToDelete) {
      deleteDoc(docToDelete.id);
    }
  };

  const filteredDocs = useMemo(() => {
    if (!status || status === 'all') return docs;
    const matchesDoc = (d: DocItem): boolean => d.status === status;
    const hasMatchingDescendant = (parentId: number): boolean => {
      return docs.some(
        (child) => child.parent_id === parentId && (matchesDoc(child) || hasMatchingDescendant(child.id))
      );
    };
    return docs.filter((d) => matchesDoc(d) || hasMatchingDescendant(d.id));
  }, [docs, status]);

  return (
    <Box>
      <DocsHeader />

      <Card size="2">
        <Tabs.Root value={status} onValueChange={setStatus}>
          <Tabs.List mb="3" aria-label="Filter docs by status">
            <Tabs.Trigger value="all" data-testid="status-tab-all">All</Tabs.Trigger>
            <Tabs.Trigger value="published" data-testid="status-tab-published">Published</Tabs.Trigger>
            <Tabs.Trigger value="in_review" data-testid="status-tab-in_review">In Review</Tabs.Trigger>
            <Tabs.Trigger value="ready_for_publish" data-testid="status-tab-ready_for_publish">Ready for Publish</Tabs.Trigger>
            <Tabs.Trigger value="draft" data-testid="status-tab-draft">Draft</Tabs.Trigger>
            <Tabs.Trigger value="archived" data-testid="status-tab-archived">Archived</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        <DocsSearchBar value={search} onChange={setSearch} />
        <DocsTable
          docs={filteredDocs}
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
