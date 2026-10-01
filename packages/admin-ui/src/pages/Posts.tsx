import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getPublicSiteUrl } from '../utils/api';
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
  const [search, setSearch] = useState('');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [postToDelete, setPostToDelete] = useState<PostItem | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await apiFetch('/api/entries');
        if (res.ok) {
          const data = await res.json();
          const mapped = data
            .filter((e: any) => e.type === 'post')
            .map((e: any) => ({
              id: e.id,
              title: e.title,
              slug: e.slug,
              status: e.status,
              date: (e.published_at || e.created_at || '').split(/[ T]/)[0] || (e.published_at || e.created_at || ''),
            }));
          setPosts(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch posts', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const filteredPosts = posts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/api/entries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } else {
        console.error('Delete failed', await res.text());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPostToDelete(null);
    }
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
    <Box style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Posts
          </Heading>
          <Text size="2" color="gray">
            Manage your blog posts and articles
          </Text>
        </Box>
        <Button variant="solid" color="iris" onClick={() => navigate('/editor?type=post')}>
          <PlusIcon width="16" height="16" />
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
                      <IconButton
                        size="1"
                        variant="ghost"
                        color="gray"
                        onClick={() => window.open(getPublicSiteUrl(`/post/${post.slug}`), '_blank')}
                        title="View Public Post"
                      >
                        <ExternalLinkIcon width="16" height="16" />
                      </IconButton>
                      <IconButton
                        size="1"
                        variant="ghost"
                        color="gray"
                        onClick={() => navigate(`/editor/${post.id}`)}
                        title="Edit Post"
                      >
                        <Pencil1Icon width="16" height="16" />
                      </IconButton>
                      <IconButton
                        size="1"
                        variant="ghost"
                        color="red"
                        onClick={() => setPostToDelete(post)}
                        title="Delete Post"
                      >
                        <TrashIcon width="16" height="16" />
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
