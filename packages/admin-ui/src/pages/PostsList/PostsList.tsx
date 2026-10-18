import React, { useState, useMemo } from 'react';
import { Box, Card } from '@radix-ui/themes';
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
  const { search, setSearch } = usePostsFilters();

  const { bulkMutate, isPending: isBulkPending } = useBulkEntries({
    onSuccess: () => {
      setSelectedIds(new Set());
    },
  });

  const filteredPosts = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
    );
  }, [posts, search]);

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
