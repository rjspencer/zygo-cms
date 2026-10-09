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
  ChevronRightIcon,
  ChevronDownIcon
} from '@radix-ui/react-icons';

interface DocItem {
  id: number;
  title: string;
  slug: string;
  path: string;
  status: 'published' | 'draft';
  updatedAt: string;
  parent_id: number | null;
  sort_order: number | null;
}

export const DocsList: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const { data: docs = [] } = useQuery<DocItem[]>({
    queryKey: ['entries', 'docs'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/docs');
      if (!res.ok) throw new Error('Failed to fetch docs');
      const data = await res.json();
      return data.entries.map((e: any) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        path: e.path || `/${e.slug}`,
        status: e.status,
        updatedAt: (e.published_at || e.created_at || '').split(' ')[0] || (e.published_at || e.created_at || ''),
        parent_id: e.parent_id,
        sort_order: e.sort_order,
      }));
    },
  });

  const toggleExpand = (id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderTree = (parentId: number | null, depth = 0): React.ReactNode => {
    let children = docs.filter(d => d.parent_id === parentId);
    if (children.length === 0) return null;
    
    // Sort by sort_order
    children = children.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return children.map((doc) => {
      const hasChildren = docs.some(d => d.parent_id === doc.id);
      const isExpanded = expanded[doc.id] !== false; // Default to expanded
      const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) || 
                            doc.slug.toLowerCase().includes(search.toLowerCase());

      if (search && !matchesSearch && !hasChildren) return null; // Very basic search filtering
      
      return (
        <React.Fragment key={doc.id}>
          <Table.Row style={search && !matchesSearch ? {opacity: 0.5} : {}}>
            <Table.RowHeaderCell style={{ paddingLeft: `${depth * 24 + 16}px` }}>
              <Flex align="center" gap="2">
                {hasChildren ? (
                  <IconButton 
                    size="1" 
                    variant="ghost" 
                    onClick={() => toggleExpand(doc.id)}
                    style={{ margin: 0, padding: 0 }}
                  >
                    {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  </IconButton>
                ) : (
                  <Box style={{ width: '20px' }} />
                )}
                <Text weight="medium">{doc.title}</Text>
              </Flex>
            </Table.RowHeaderCell>
            <Table.Cell>
              <Text size="2" color="gray">
                {doc.path}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Badge color={doc.status === 'published' ? 'green' : 'gray'}>
                {doc.status}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <Text size="2" color="gray">
                {doc.updatedAt}
              </Text>
            </Table.Cell>
            <Table.Cell style={{ textAlign: 'right' }}>
              <Flex justify="end" gap="1">
                <IconButton style={{ cursor: 'pointer' }} size="2"
                  variant="ghost"
                  color="gray"
                  onClick={() => window.open(getPublicSiteUrl(doc.path), '_blank')}
                  title="View Public Doc"
                >
                  <ExternalLinkIcon width="18" height="18" />
                </IconButton>
                <IconButton style={{ cursor: 'pointer' }} size="2"
                  variant="ghost"
                  color="gray"
                  onClick={() => navigate(`/docs/editor/${doc.id}`)}
                  title="Edit Doc"
                >
                  <Pencil1Icon width="18" height="18" />
                </IconButton>
              </Flex>
            </Table.Cell>
          </Table.Row>
          {hasChildren && isExpanded && renderTree(doc.id, depth + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <Box>
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Docs
          </Heading>
          <Text size="2" color="gray">
            Manage your site's documentation hierarchy
          </Text>
        </Box>
        <Button variant="solid" color="iris" onClick={() => navigate('/docs/editor/new')}>
          <PlusIcon width="18" height="18" />
          Create Doc
        </Button>
      </Flex>

      <Card size="2">
        <Box mb="4">
          <TextField.Root
            placeholder="Search docs by title or slug..."
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
              <Table.ColumnHeaderCell>Doc Title</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Path / URL</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Last Modified</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {renderTree(null)}
          </Table.Body>
        </Table.Root>
      </Card>
    </Box>
  );
};

export default DocsList;
