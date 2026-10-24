import React, { useState, useMemo } from 'react';
import { Box, Card, Tabs } from '@radix-ui/themes';
import {
  PostsHeader,
  PostsSearchBar,
  PostsTable,
  DeletePostDialog,
} from './components';
import { BulkActionBar } from '../../components/BulkActionBar';
import { useBulkEntries } from '../../hooks/useBulkEntries';
import { usePostsData, usePostsFilters } from './hooks';
import type { PostItem } from './types';

export const PostsList: React.FC = () => {
  const [postToDelete, setPostToDelete] = useState<PostItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { posts, isLoading, deletePost, isDeleting } = usePostsData({
    onDeleteSettled: () => setPostToDelete(null),
  });
  const { search, setSearch, status, setStatus } = usePostsFilters();

  const { bulkMutate, isPending: isBulkPending } = useBulkEntries({
    onSuccess: () => {
      setSelectedIds(new Set());
    },
  });

  const filteredPosts = useMemo(() => {
    const q = search.toLowerCase();
    return posts.filter((p) => {
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q);
      const matchesStatus =
        !status || status === 'all' || p.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [posts, search, status]);

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
    if (filteredPosts.length === 0) return;
    if (selectedIds.size === filteredPosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPosts.map((p) => p.id)));
    }
  };

  const handleConfirmDelete = () => {
    if (postToDelete) {
      deletePost(postToDelete.id);
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
      <PostsHeader />

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
          <Tabs.List mb="3" aria-label="Filter posts by status">
            <Tabs.Trigger value="all" data-testid="status-tab-all">All</Tabs.Trigger>
            <Tabs.Trigger value="published" data-testid="status-tab-published">Published</Tabs.Trigger>
            <Tabs.Trigger value="in_review" data-testid="status-tab-in_review">In Review</Tabs.Trigger>
            <Tabs.Trigger value="ready_for_publish" data-testid="status-tab-ready_for_publish">Ready for Publish</Tabs.Trigger>
            <Tabs.Trigger value="draft" data-testid="status-tab-draft">Draft</Tabs.Trigger>
            <Tabs.Trigger value="archived" data-testid="status-tab-archived">Archived</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        <PostsSearchBar value={search} onChange={setSearch} />
        <PostsTable
          posts={filteredPosts}
          isLoading={isLoading}
          onDeleteClick={(post) => setPostToDelete(post)}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />
      </Card>

      <DeletePostDialog
        post={postToDelete}
        isOpen={postToDelete !== null}
        onOpenChange={(open) => !open && setPostToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </Box>
  );
};

export default PostsList;
