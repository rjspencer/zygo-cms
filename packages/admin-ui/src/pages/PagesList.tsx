import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getPublicSiteUrl } from '../utils/api';
import { useQuery } from '@tanstack/react-query';
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
} from '@radix-ui/themes';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  ExternalLinkIcon,
} from '@radix-ui/react-icons';

interface PageItem {
  id: number;
  title: string;
  slug: string;
  status: 'published' | 'draft';
  updatedAt: string;
}

export const PagesList: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: pages = [] } = useQuery<PageItem[]>({
    queryKey: ['entries', 'pages'],
    queryFn: async () => {
      const res = await apiFetch('/api/entries');
      if (!res.ok) throw new Error('Failed to fetch pages');
      const data = await res.json();
      return data
        .filter((e: any) => e.type === 'page')
        .map((e: any) => ({
          id: e.id,
          title: e.title,
          slug: e.path || `/${e.slug}`,
          status: e.status,
          updatedAt: (e.published_at || e.created_at || '').split(' ')[0] || (e.published_at || e.created_at || ''),
        }));
    },
  });

  const filteredPages = pages.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Pages
          </Heading>
          <Text size="2" color="gray">
            Manage static and landing pages for your site
          </Text>
        </Box>
        <Button variant="solid" color="cyan" onClick={() => navigate('/pages/editor/new')}>
          <PlusIcon width="18" height="18" />
          Create Page
        </Button>
      </Flex>

      <Card size="2">
        <Box mb="4">
          <TextField.Root
            placeholder="Search pages by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          >
            <TextField.Slot>
              <MagnifyingGlassIcon height="16" width="16" />
            </TextField.Slot>
          </TextField.Root>
        </Box>

        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Page Title</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Path / URL</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Last Modified</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filteredPages.map((page) => (
              <Table.Row key={page.id}>
                <Table.RowHeaderCell>
                  <Text weight="medium">{page.title}</Text>
                </Table.RowHeaderCell>
                <Table.Cell>
                  <Text size="2" color="gray">
                    {page.slug}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={page.status === 'published' ? 'green' : 'gray'}>
                    {page.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2" color="gray">
                    {page.updatedAt}
                  </Text>
                </Table.Cell>
                <Table.Cell style={{ textAlign: 'right' }}>
                  <Flex justify="end" gap="1">
                    <IconButton style={{ cursor: 'pointer' }} size="2"
                      variant="ghost"
                      color="gray"
                      onClick={() => window.open(getPublicSiteUrl(page.slug), '_blank')}
                      title="View Public Page"
                    >
                      <ExternalLinkIcon width="18" height="18" />
                    </IconButton>
                    <IconButton style={{ cursor: 'pointer' }} size="2"
                      variant="ghost"
                      color="gray"
                      onClick={() => navigate(`/pages/editor/${page.id}`)}
                      title="Edit Page"
                    >
                      <Pencil1Icon width="18" height="18" />
                    </IconButton>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card>
    </Box>
  );
};

export default PagesList;
