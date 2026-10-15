import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Table,
  Badge,
  IconButton,
} from '@radix-ui/themes';
import { ExternalLinkIcon, Pencil1Icon } from '@radix-ui/react-icons';
import type { RecentEntryItem } from '../types';

interface RecentEntriesTableProps {
  entries: RecentEntryItem[];
}

export const RecentEntriesTable: React.FC<RecentEntriesTableProps> = ({ entries }) => {
  const navigate = useNavigate();

  return (
    <Card size="2">
      <Flex justify="between" align="center" mb="4">
        <Box>
          <Heading size="4">Recent Content</Heading>
          <Text size="2" color="gray">
            Recently updated posts and pages
          </Text>
        </Box>
        <Button variant="ghost" size="2" onClick={() => navigate('/posts')}>
          View All
        </Button>
      </Flex>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Title</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>Actions</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {entries.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={5}>
                <Text color="gray">No recent entries found.</Text>
              </Table.Cell>
            </Table.Row>
          ) : (
            entries.map((entry) => (
              <Table.Row key={entry.id}>
                <Table.RowHeaderCell>
                  <a
                    href={entry.liveUrl}
                    target="_self"
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    <Text weight="medium">{entry.title}</Text>
                  </a>
                </Table.RowHeaderCell>
                <Table.Cell>
                  <Badge variant="outline" color={entry.type === 'post' ? 'crimson' : 'cyan'}>
                    {entry.type}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={entry.status === 'published' ? 'green' : 'gray'}>
                    {entry.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2" color="gray">
                    {entry.date}
                  </Text>
                </Table.Cell>
                <Table.Cell style={{ textAlign: 'right' }}>
                  <Flex justify="end" gap="1">
                    <IconButton
                      style={{ cursor: 'pointer' }}
                      size="2"
                      variant="ghost"
                      color="gray"
                      asChild
                      title="View on Live Site"
                    >
                      <a href={entry.liveUrl} target="_self">
                        <ExternalLinkIcon width="18" height="18" />
                      </a>
                    </IconButton>
                    <IconButton
                      style={{ cursor: 'pointer' }}
                      size="2"
                      variant="ghost"
                      color="gray"
                      onClick={() =>
                        navigate(
                          entry.type === 'page'
                            ? `/pages/editor/${entry.id}`
                            : `/posts/editor/${entry.id}`
                        )
                      }
                      title="Edit"
                    >
                      <Pencil1Icon width="18" height="18" />
                    </IconButton>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table.Root>
    </Card>
  );
};
