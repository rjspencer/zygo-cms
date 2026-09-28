import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [pages, setPages] = useState<PageItem[]>([]);

  React.useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await fetch('/api/entries');
        if (res.ok) {
          const data = await res.json();
          const mapped = data
            .filter((e: any) => e.type === 'page')
            .map((e: any) => ({
              id: e.id,
              title: e.title,
              slug: e.path || `/${e.slug}`,
              status: e.status,
              updatedAt: (e.published_at || e.created_at || '').split(' ')[0] || (e.published_at || e.created_at || ''),
            }));
          setPages(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch pages', err);
      }
    };
    fetchPages();
  }, []);

  const filteredPages = pages.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Pages
          </Heading>
          <Text size="2" color="gray">
            Manage static and landing pages for your site
          </Text>
        </Box>
        <Button variant="solid" color="iris" onClick={() => navigate('/editor?type=page')}>
          <PlusIcon width="16" height="16" />
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
                    <IconButton
                      size="1"
                      variant="ghost"
                      color="gray"
                      onClick={() => window.open(`${import.meta.env.VITE_PUBLIC_SITE_URL || ''}${page.slug.startsWith('/') ? '' : '/'}${page.slug}`, '_blank')}
                      title="View Public Page"
                    >
                      <ExternalLinkIcon width="16" height="16" />
                    </IconButton>
                    <IconButton
                      size="1"
                      variant="ghost"
                      color="gray"
                      onClick={() => navigate(`/editor/${page.id}?type=page`)}
                      title="Edit Page"
                    >
                      <Pencil1Icon width="16" height="16" />
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
