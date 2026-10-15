import React, { useState, useMemo } from 'react';
import { Box, Card } from '@radix-ui/themes';
import {
  PostsHeader,
  PostsSearchBar,
  PostsTable,
  DeletePostDialog,
} from './components';
import { usePostsData, usePostsFilters } from './hooks';
import type { PostItem } from './types';

export const PostsList: React.FC = () => {
  const [postToDelete, setPostToDelete] = useState<PostItem | null>(null);

  const { posts, isLoading, deletePost, isDeleting } = usePostsData({
    onDeleteSettled: () => setPostToDelete(null),
  });
  const { search, setSearch } = usePostsFilters();

  const filteredPosts = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
    );
  }, [posts, search]);

  const handleConfirmDelete = () => {
    if (postToDelete) {
      deletePost(postToDelete.id);
    }
  };

  return (
    <Box>
      <PostsHeader />

      <Card size="2">
        <PostsSearchBar value={search} onChange={setSearch} />
        <PostsTable
          posts={filteredPosts}
          isLoading={isLoading}
          onDeleteClick={(post) => setPostToDelete(post)}
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
