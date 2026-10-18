import React, { useState, useMemo } from 'react';
import { Box, Card } from '@radix-ui/themes';
import { PagesHeader, PagesSearchBar, PagesTable } from './components';
import { BulkActionBar } from '../../components/BulkActionBar';
import { useBulkEntries } from '../../hooks/useBulkEntries';
import { usePagesData, usePagesFilters } from './hooks';

export const PagesList: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { pages, isLoading } = usePagesData();
  const { search, setSearch } = usePagesFilters();

  const { bulkMutate, isPending: isBulkPending } = useBulkEntries({
    onSuccess: () => {
      setSelectedIds(new Set());
    },
  });

  const filteredPages = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
    );
  }, [pages, search]);

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (filteredPages.length === 0) return;
    if (selectedIds.size === filteredPages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPages.map((p) => p.id)));
    }
  };

  const handleBulkPublish = () => {
    bulkMutate({ ids: Array.from(selectedIds), action: 'publish' });
  };

  const handleBulkUnpublish = () => {
    bulkMutate({ ids: Array.from(selectedIds), action: 'unpublish' });
  };

  const handleBulkTrash = () => {
    bulkMutate({ ids: Array.from(selectedIds), action: 'trash' });
  };

  const handleBulkAddTags = (tags: string) => {
    bulkMutate({ ids: Array.from(selectedIds), action: 'add_tags', tags });
  };

  return (
    <Box>
      <PagesHeader />

      <BulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onPublish={handleBulkPublish}
        onUnpublish={handleBulkUnpublish}
        onAddTags={handleBulkAddTags}
        onTrash={handleBulkTrash}
        isPending={isBulkPending}
      />

      <Card size="2">
        <PagesSearchBar value={search} onChange={setSearch} />
        <PagesTable
          pages={filteredPages}
          isLoading={isLoading}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />
      </Card>
    </Box>
  );
};

export default PagesList;
