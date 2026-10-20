import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Flex,
  Box,
  Text,
  Badge,
  IconButton,
} from '@radix-ui/themes';
import {
  Pencil1Icon,
  TrashIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@radix-ui/react-icons';
import { getPublicSiteUrl } from '../../../utils/api';
import type { DocItem } from '../types';

export interface DocsTableProps {
  docs: DocItem[];
  search: string;
  isLoading?: boolean;
  onDeleteClick?: (doc: DocItem) => void;
}

export const DocsTable: React.FC<DocsTableProps> = ({ docs, search, isLoading, onDeleteClick }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const toggleExpand = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] }));
  };

  const renderTree = (parentId: number | null, depth = 0): React.ReactNode => {
    let children = docs.filter((d) => d.parent_id === parentId);
    if (children.length === 0) return null;

    // Sort by sort_order
    children = [...children].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return children.map((doc) => {
      const hasChildren = docs.some((d) => d.parent_id === doc.id);
      const isExpanded = expanded[doc.id] !== false; // Default to expanded
      const matchesSearch =
        doc.title.toLowerCase().includes(search.toLowerCase()) ||
        doc.slug.toLowerCase().includes(search.toLowerCase());

      if (search && !matchesSearch && !hasChildren) return null; // Very basic search filtering

      return (
        <React.Fragment key={doc.id}>
          <Table.Row style={search && !matchesSearch ? { opacity: 0.5 } : {}}>
            <Table.RowHeaderCell style={{ paddingLeft: `${depth * 24 + 16}px` }}>
              <Flex align="center" gap="2">
                {hasChildren ? (
                  <IconButton
                    size="1"
                    variant="ghost"
                    onClick={() => toggleExpand(doc.id)}
                    style={{ margin: 0, padding: 0 }}
                    aria-label={isExpanded ? `Collapse ${doc.title}` : `Expand ${doc.title}`}
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
                <IconButton
                  style={{ cursor: 'pointer' }}
                  size="2"
                  variant="ghost"
                  color="gray"
                  onClick={() => window.open(getPublicSiteUrl(doc.path), '_blank')}
                  title="View Public Doc"
                  aria-label={`View ${doc.title} on public site`}
                >
                  <ExternalLinkIcon width="18" height="18" />
                </IconButton>
                <IconButton
                  style={{ cursor: 'pointer' }}
                  size="2"
                  variant="ghost"
                  color="gray"
                  onClick={() => navigate(`/docs/editor/${doc.id}`)}
                  title="Edit Doc"
                  aria-label={`Edit ${doc.title}`}
                >
                  <Pencil1Icon width="18" height="18" />
                </IconButton>
                <IconButton
                  style={{ cursor: 'pointer' }}
                  size="2"
                  variant="ghost"
                  color="red"
                  onClick={() => onDeleteClick?.(doc)}
                  title="Delete Doc"
                  aria-label={`Delete ${doc.title}`}
                  data-testid={`delete-doc-${doc.id}`}
                >
                  <TrashIcon width="18" height="18" />
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
        {isLoading ? (
          <Table.Row>
            <Table.Cell colSpan={5}>
              <Text color="gray">Loading documentation...</Text>
            </Table.Cell>
          </Table.Row>
        ) : docs.length === 0 ? (
          <Table.Row>
            <Table.Cell colSpan={5}>
              <Text color="gray">No documentation found.</Text>
            </Table.Cell>
          </Table.Row>
        ) : (
          renderTree(null)
        )}
      </Table.Body>
    </Table.Root>
  );
};
