import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Text, Badge, Flex, IconButton } from '@radix-ui/themes';
import { Pencil1Icon, TrashIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import { getPublicSiteUrl } from '../../../utils/api';
import type { PostItem, PostStatus } from '../types';

export interface PostsTableProps {
  posts: PostItem[];
  isLoading?: boolean;
  onDeleteClick: (post: PostItem) => void;
}

const getStatusColor = (status: PostStatus) => {
  switch (status) {
    case 'published':
      return 'green';
    case 'draft':
      return 'gray';
    case 'scheduled':
      return 'amber';
  }
};

export const PostsTable: React.FC<PostsTableProps> = ({
  posts,
  isLoading,
  onDeleteClick,
}) => {
  const navigate = useNavigate();

  return (
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
        {isLoading ? (
          <Table.Row>
            <Table.Cell colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
              <Text color="gray">Loading posts...</Text>
            </Table.Cell>
          </Table.Row>
        ) : posts.length === 0 ? (
          <Table.Row>
            <Table.Cell colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
              <Text color="gray">No posts found</Text>
            </Table.Cell>
          </Table.Row>
        ) : (
          posts.map((post) => (
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
                    style={{ cursor: 'pointer' }}
                    size="2"
                    variant="ghost"
                    color="gray"
                    onClick={() =>
                      window.open(getPublicSiteUrl(`/post/${post.slug}`), '_blank')
                    }
                    title="View Public Post"
                  >
                    <ExternalLinkIcon width="18" height="18" />
                  </IconButton>
                  <IconButton
                    style={{ cursor: 'pointer' }}
                    size="2"
                    variant="ghost"
                    color="gray"
                    onClick={() => navigate(`/posts/editor/${post.id}`)}
                    title="Edit Post"
                  >
                    <Pencil1Icon width="18" height="18" />
                  </IconButton>
                  <IconButton
                    style={{ cursor: 'pointer' }}
                    size="2"
                    variant="ghost"
                    color="red"
                    onClick={() => onDeleteClick(post)}
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
  );
};

export default PostsTable;
