import React, { useState, useMemo } from 'react';
import { Box, Card, Tabs } from '@radix-ui/themes';
import {
  PagesHeader,
  PagesSearchBar,
  PagesTable,
  DeletePageDialog,
} from './components';
import { BulkActionBar } from '../../components/BulkActionBar';
import { useBulkEntries } from '../../hooks/useBulkEntries';
import { usePagesData, usePagesFilters } from './hooks';
import type { PageItem } from './types';

export const PagesList: React.FC = () => {
  const [pageToDelete, setPageToDelete] = useState<PageItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { pages, isLoading, deletePage, isDeleting } = usePagesData({
    onDeleteSettled: () => setPageToDelete(null),
  });
  const { search, setSearch, status, setStatus } = usePagesFilters();

  const { bulkMutate, isPending: isBulkPending } = useBulkEntries({
    onSuccess: () => {
      setSelectedIds(new Set());
    },
  });

  const filteredPages = useMemo(() => {
    const q = search.toLowerCase();
    return pages.filter((p) => {
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q);
      const matchesStatus =
        !status || status === 'all' || p.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [pages, search, status]);

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

  const handleConfirmDelete = () => {
    if (pageToDelete) {
      deletePage(pageToDelete.id);
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
        <Tabs.Root value={status} onValueChange={setStatus}>
          <Tabs.List mb="3" aria-label="Filter pages by status">
            <Tabs.Trigger value="all" data-testid="status-tab-all">All</Tabs.Trigger>
            <Tabs.Trigger value="published" data-testid="status-tab-published">Published</Tabs.Trigger>
            <Tabs.Trigger value="in_review" data-testid="status-tab-in_review">In Review</Tabs.Trigger>
            <Tabs.Trigger value="ready_for_publish" data-testid="status-tab-ready_for_publish">Ready for Publish</Tabs.Trigger>
            <Tabs.Trigger value="draft" data-testid="status-tab-draft">Draft</Tabs.Trigger>
            <Tabs.Trigger value="archived" data-testid="status-tab-archived">Archived</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        <PagesSearchBar value={search} onChange={setSearch} />
        <PagesTable
          pages={filteredPages}
          isLoading={isLoading}
          onDeleteClick={(page) => setPageToDelete(page)}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />
      </Card>

      <DeletePageDialog
        page={pageToDelete}
        isOpen={pageToDelete !== null}
        onOpenChange={(open) => !open && setPageToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </Box>
  );
};

export default PagesList;
