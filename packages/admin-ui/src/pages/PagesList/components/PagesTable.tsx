import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Text, Badge, Flex, IconButton, Checkbox } from '@radix-ui/themes';
import { Pencil1Icon, TrashIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import { getPublicSiteUrl } from '../../../utils/api';
import type { PageItem, PageStatus } from '../types';

export interface PagesTableProps {
  pages: PageItem[];
  isLoading?: boolean;
  onDeleteClick?: (page: PageItem) => void;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onToggleSelectAll?: () => void;
}

const getPageStatusColor = (
  status: PageStatus
): 'gray' | 'amber' | 'blue' | 'green' | 'red' | 'purple' => {
  switch (status) {
    case 'draft':
      return 'gray';
    case 'in_review':
      return 'amber';
    case 'ready_for_publish':
      return 'blue';
    case 'published':
      return 'green';
    case 'archived':
      return 'red';
    case 'scheduled':
      return 'purple';
    default:
      return 'gray';
  }
};

const formatPageStatus = (status: PageStatus): string => {
  switch (status) {
    case 'in_review':
      return 'in review';
    case 'ready_for_publish':
      return 'ready for publish';
    default:
      return status;
  }
};

export const PagesTable: React.FC<PagesTableProps> = ({
  pages,
  isLoading,
  onDeleteClick,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}) => {
  const navigate = useNavigate();

  const isAllSelected =
    pages.length > 0 && selectedIds && selectedIds.size === pages.length;
  const isSomeSelected =
    selectedIds && selectedIds.size > 0 && selectedIds.size < pages.length;

  return (
    <Table.Root variant="surface">
      <Table.Header>
        <Table.Row>
          {onToggleSelectAll && (
            <Table.ColumnHeaderCell width="40px">
              <Checkbox
                checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                onCheckedChange={onToggleSelectAll}
                aria-label="Select all pages"
              />
            </Table.ColumnHeaderCell>
          )}
          <Table.ColumnHeaderCell>Page Title</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Path / URL</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Last Modified</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>Actions</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {isLoading ? (
          <Table.Row>
            <Table.Cell colSpan={onToggleSelectAll ? 6 : 5} style={{ textAlign: 'center', padding: '24px' }}>
              <Text color="gray">Loading pages...</Text>
            </Table.Cell>
          </Table.Row>
        ) : pages.length === 0 ? (
          <Table.Row>
            <Table.Cell colSpan={onToggleSelectAll ? 6 : 5} style={{ textAlign: 'center', padding: '24px' }}>
              <Text color="gray">No pages found</Text>
            </Table.Cell>
          </Table.Row>
        ) : (
          pages.map((page) => (
            <Table.Row key={page.id}>
              {onToggleSelect && selectedIds && (
                <Table.Cell>
                  <Checkbox
                    checked={selectedIds.has(page.id)}
                    onCheckedChange={() => onToggleSelect(page.id)}
                    aria-label={`Select page ${page.title}`}
                    data-testid={`select-page-${page.id}`}
                  />
                </Table.Cell>
              )}
              <Table.RowHeaderCell>
                <Text weight="medium">{page.title}</Text>
              </Table.RowHeaderCell>
              <Table.Cell>
                <Text size="2" color="gray">
                  {page.slug}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Badge color={getPageStatusColor(page.status)}>
                  {formatPageStatus(page.status)}
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
                    style={{ cursor: 'pointer' }}
                    size="2"
                    variant="ghost"
                    color="gray"
                    onClick={() => window.open(getPublicSiteUrl(page.slug), '_blank')}
                    title="View Public Page"
                  >
                    <ExternalLinkIcon width="18" height="18" />
                  </IconButton>
                  <IconButton
                    style={{ cursor: 'pointer' }}
                    size="2"
                    variant="ghost"
                    color="gray"
                    onClick={() => navigate(`/pages/editor/${page.id}`)}
                    title="Edit Page"
                  >
                    <Pencil1Icon width="18" height="18" />
                  </IconButton>
                  <IconButton
                    style={{ cursor: page.slug === '/' ? 'not-allowed' : 'pointer' }}
                    size="2"
                    variant="ghost"
                    color={page.slug === '/' ? 'gray' : 'red'}
                    disabled={page.slug === '/'}
                    onClick={() => page.slug !== '/' && onDeleteClick?.(page)}
                    title={page.slug === '/' ? 'The Home page cannot be deleted' : 'Delete Page'}
                    aria-label={`Delete ${page.title}`}
                    data-testid={`delete-page-${page.id}`}
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

export default PagesTable;
