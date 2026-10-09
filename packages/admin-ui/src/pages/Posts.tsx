import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getPublicSiteUrl } from '../utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Card,
  Table,
  Badge,
  TextField,
  IconButton,
  Dialog,
} from '@radix-ui/themes';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  TrashIcon,
  ExternalLinkIcon,
} from '@radix-ui/react-icons';

interface PostItem {
  id: number;
  title: string;
  slug: string;
  status: 'published' | 'draft' | 'scheduled';
  date: string;
}

export const Posts: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [postToDelete, setPostToDelete] = useState<PostItem | null>(null);

  const { data: posts = [], isLoading: loading } = useQuery<PostItem[]>({
    queryKey: ['entries', 'posts'],
    queryFn: async () => {
      const res = await apiFetch('/api/entries');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      return data
        .filter((e: any) => e.type === 'post')
        .map((e: any) => ({
          id: e.id,
          title: e.title,
          slug: e.slug,
          status: e.status,
          date: (e.published_at || e.created_at || '').split(/[ T]/)[0] || (e.published_at || e.created_at || ''),
        }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/entries/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(await res.text());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
    onError: (err) => {
      console.error('Delete failed', err);
    },
    onSettled: () => {
      setPostToDelete(null);
    },
  });

  const filteredPosts = posts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const getStatusColor = (status: PostItem['status']) => {
    switch (status) {
      case 'published':
        return 'green';
      case 'draft':
        return 'gray';
      case 'scheduled':
        return 'amber';
    }
  };

  return (
    <Box>
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Posts
          </Heading>
          <Text size="2" color="gray">
            Manage your blog posts and articles
          </Text>
        </Box>
        <Button variant="solid" color="iris" onClick={() => navigate('/posts/editor/new')}>
          <PlusIcon width="18" height="18" />
          Create Post
        </Button>
      </Flex>

      <Card size="2">
        {/* Search Bar */}
        <Box mb="4">
          <TextField.Root
            placeholder="Search posts by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          >
            <TextField.Slot>
              <MagnifyingGlassIcon height="16" width="16" />
            </TextField.Slot>
          </TextField.Root>
        </Box>

        {/* Posts Table */}
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Title</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Slug</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading ? (
              <Table.Row>
                <Table.Cell colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
                  <Text color="gray">Loading posts...</Text>
                </Table.Cell>
              </Table.Row>
            ) : filteredPosts.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
                  <Text color="gray">No posts found</Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              filteredPosts.map((post) => (
                <Table.Row key={post.id}>
                  <Table.RowHeaderCell>
                    <Text weight="medium">{post.title}</Text>
                  </Table.RowHeaderCell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      /post/{post.slug}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={getStatusColor(post.status)}>{post.status}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {post.date}
                    </Text>
                  </Table.Cell>
                  <Table.Cell style={{ textAlign: 'right' }}>
                    <Flex justify="end" gap="1">
                      <IconButton style={{ cursor: 'pointer' }} size="2"
                        variant="ghost"
                        color="gray"
                        onClick={() => window.open(getPublicSiteUrl(`/post/${post.slug}`), '_blank')}
                        title="View Public Post"
                      >
                        <ExternalLinkIcon width="18" height="18" />
                      </IconButton>
                      <IconButton style={{ cursor: 'pointer' }} size="2"
                        variant="ghost"
                        color="gray"
                        onClick={() => navigate(`/posts/editor/${post.id}`)}
                        title="Edit Post"
                      >
                        <Pencil1Icon width="18" height="18" />
                      </IconButton>
                      <IconButton style={{ cursor: 'pointer' }} size="2"
                        variant="ghost"
                        color="red"
                        onClick={() => setPostToDelete(post)}
                        title="Delete Post"
                      >
                        <TrashIcon width="18" height="18" />
                      </IconButton>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={postToDelete !== null} onOpenChange={(open) => !open && setPostToDelete(null)}>
        <Dialog.Content maxWidth="450px">
          <Dialog.Title>Delete Post</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Are you sure you want to delete &ldquo;{postToDelete?.title}&rdquo;? This action will remove it from the edge database.
          </Dialog.Description>

          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              variant="solid"
              color="red"
              onClick={() => postToDelete && handleDelete(postToDelete.id)}
            >
              Delete
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export default Posts;
